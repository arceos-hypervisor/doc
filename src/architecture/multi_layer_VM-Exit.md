# [多层VM-Exit处理机制](https://github.com/orgs/arceos-hypervisor/discussions/19)

众所周知，VM-Exit 对于获取客户虚拟机的运行状态以及与客户虚拟机进行交互至关重要。

VM-Exit 用于设备仿真和 vCPU 调度。

在 x86_64、aarch64 和 riscv64 架构中，VM-Exit 遵循相同的设计逻辑，但实现方式略有不同。

![](../assets/vmexit-handling.png)

# Inner-VCpu处理

在 x86_64 架构下，某些 VM-Exit 项目是特定于架构的（例如 `VmxExitReason::CR_ACCESS`、`VmxExitReason::CPUID`）。在我们当前的设计中，这些 VM-Exit 由 [`VmxVcpu`] 本身通过 `builtin_vmexit_handler` 处理，而其他 VM-Exit 类型则由 `vcpu.run()` 返回，并由调用 `vcpu.run()` 的程序来处理。

```rust
impl<H: AxVMHal> VmxVcpu<H> {
    /// Handle vm-exits than can and should be handled by [`VmxVcpu`] itself.
    ///
    /// Return the result or None if the vm-exit was not handled.
    fn builtin_vmexit_handler(&mut self, exit_info: &VmxExitInfo) -> Option<AxResult> {
        // Following vm-exits are handled here:
        // - interrupt window: turn off interrupt window;
        // - xsetbv: set guest xcr;
        // - cr access: just panic;
        match exit_info.exit_reason {
            VmxExitReason::INTERRUPT_WINDOW => Some(self.set_interrupt_window(false)),
            VmxExitReason::PREEMPTION_TIMER => Some(self.handle_vmx_preemption_timer()),
            VmxExitReason::XSETBV => Some(self.handle_xsetbv()),
            VmxExitReason::CR_ACCESS => Some(self.handle_cr()),
            VmxExitReason::CPUID => Some(self.handle_cpuid()),
            _ => None,
        }
    }
}
```

此外，`VmxExitReason::IoRead/IoWrite` 和 `VmxExitReason::MsrRead/MsrWrite` 也是 x86_64 特有的，但这些 VM-Exit 与端口 I/O 或 Msr 设备仿真相关，因此更适合在 `vcpu.run()` 之外处理。

# Inner-VM处理

由于 axvm 中的虚拟机结构负责虚拟机的资源管理，例如模拟设备和地址空间（axaddrspace），所以更倾向于将与设备模拟相关的以及与页面错误相关的（数据中止）虚拟机退出保留在 axvm 内部。

也就是说，在虚拟机结构中提供一个 `run_vcpu()` 函数，并将与设备模拟相关的 VM 退出处理整合到 `vm.run_vcpu()`

```rust
impl<H: AxVMHal> AxVM<H> {
    pub fn run_vcpu(&self, vcpu_id: usize) -> AxResult<AxVCpuExitReason> {
        let vcpu = self
            .vcpu(vcpu_id)
            .ok_or_else(|| ax_err_type!(InvalidInput, "Invalid vcpu_id"))?;

        vcpu.bind()?;

        let exit_reason = loop {
            let exit_reason = vcpu.run()?;

            trace!("{exit_reason:#x?}");
            let handled = match &exit_reason {
                AxVCpuExitReason::MmioRead { addr: _, width: _ } => true,
                AxVCpuExitReason::MmioWrite {
                    addr: _,
                    width: _,
                    data: _,
                } => true,
                AxVCpuExitReason::IoRead { port: _, width: _ } => true,
                AxVCpuExitReason::IoWrite {
                    port: _,
                    width: _,
                    data: _,
                } => true,
                AxVCpuExitReason::NestedPageFault { addr, access_flags } => self
                    .inner_mut
                    .address_space
                    .lock()
                    .handle_page_fault(*addr, *access_flags),
                _ => false,
            };
            if !handled {
                break exit_reason;
            }
        };

        vcpu.unbind()?;
        Ok(exit_reason)
    }
}
```

因此，将设备模拟操作整合到 `axvm` 模块中，这样 `vmm-app` 只需要传入配置文件就可以，然后根据需要创建模拟设备实例，而不必关心模拟设备的特定运行时行为以及地址空间。

当然，这是在这些 VM-exit 不触发 vCPU 调度的条件下。

# (Outer-VM) vmm-app处理

我们重用 task 来实现 vcpu 的运行时管理和调度。

这个逻辑是在 `vmm-app` 中实现的，因为 VMM 自然需要关注 vCPU 调度，并且它在 `vmm-app` 中整合了对 ArceOS 的 axtask 的依赖。

对于前两层没有处理的 VM-Exit，它们将从 `vcpu::run()` 的返回值中获取，并在这里进行处理，包括处理 hypercalls（在 VMM 中处理这个似乎也相当合理）和任何需要 vcpu 调度或 vcpu 退出的 VM-Exit 类型。

```rust
        let mut task = TaskInner::new(
            || {
                let curr = axtask::current();

                let vm = curr.task_ext().vm.clone();
                let vcpu = curr.task_ext().vcpu.clone();
                let vm_id = vm.id();
                let vcpu_id = vcpu.id();

                info!("VM[{}] Vcpu[{}] waiting for running", vm.id(), vcpu.id());
                wait_for(vm_id, || vm.running());

                info!("VM[{}] Vcpu[{}] running...", vm.id(), vcpu.id());

                loop {
                    match vm.run_vcpu(vcpu_id) {
                        // match vcpu.run() {
                        Ok(exit_reason) => match exit_reason {
                            AxVCpuExitReason::Hypercall { nr, args } => {
                                debug!("Hypercall [{}] args {:x?}", nr, args);
                            }
                            AxVCpuExitReason::FailEntry {
                                hardware_entry_failure_reason,
                            } => {
                                warn!(
                                    "VM[{}] VCpu[{}] run failed with exit code {}",
                                    vm_id, vcpu_id, hardware_entry_failure_reason
                                );
                            }
                            AxVCpuExitReason::ExternalInterrupt { vector } => {
                                debug!("VM[{}] run VCpu[{}] get irq {}", vm_id, vcpu_id, vector);
                            }
                            AxVCpuExitReason::Halt => {
                                debug!("VM[{}] run VCpu[{}] Halt", vm_id, vcpu_id);
                                wait(vm_id)
                            }
                            AxVCpuExitReason::Nothing => {}
                            _ => {
                                warn!("Unhandled VM-Exit");
                            }
                        },
                        Err(err) => {
                            warn!("VM[{}] run VCpu[{}] get error {:?}", vm_id, vcpu_id, err);
                            wait(vm_id)
                        }
                    }
                }
            },
            format!("VCpu[{}]", vcpu.id()),
            KERNEL_STACK_SIZE,
        );
```