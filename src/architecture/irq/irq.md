# 虚拟中断控制器

## 各架构控制器

* x86_64: local Apic (xAPIC and x2APIC) and IO Apic
* aarch64: GIC (v2,v3,v4)
* riscv64: PLIC or APLIC

## 实现方式

### 虚拟控制器

为相应架构的中断控制器设计虚拟控制器模型，为每个 `vcpu` 创建一个内部中断模拟设备，用于管理 `systime` 中断等，为每个客户机创建一个外部中断模拟设备，用于管理 `io` 中断。

### MMIO 区域注册

在客户机进行中断控制器的寄存器读写时，会通过 `data abort` 陷入到虚拟机，到达 `axvcpu` 的如下代码段：

```rust
match &exit_reason {
    AxVCpuExitReason::MmioRead {
        addr,
        width,
        reg,
        reg_width: _,
    } => {
        let val = self
            .get_devices()
            .handle_mmio_read(*addr, (*width).into())?;
        vcpu.set_gpr(*reg, val);
        true
    }
    AxVCpuExitReason::MmioWrite { addr, width, data } => {
        self.get_devices()
            .handle_mmio_write(*addr, (*width).into(), *data as usize);
        true
    }
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
```

通过 `handle_mmio_read` 和 `handle_mmio_write` 实现相应 `mmio` 范围内的地址访问会路由到相应虚拟设备。

通过对相应虚拟寄存器的读写逻辑，实现对客户机中断设置的权限控制。

### 中断透传

虚拟中断控制器通过配置表，判断客户机是否有权限控制中断号，若有权限，则将客户机中断号相应操作透传到物理中断控制器。

### 虚拟设备到 Guest OS 的通知

绝大多数情况下，虚拟设备通知 Guest OS 的方式是虚拟中断。但虚拟中断并不完全来自虚拟设备，也可能来自直通设备的物理中断（由 Hypervisor 转发）或者来自某个 VCpu 的虚拟 IPI（同样由 Hypervisor 转发）。因此，需要一个统一的虚拟中断注入接口，用以向指定的 VCpu 注入中断。

这个接口应该放置在 AxVM 中，签名类似于 inject_interrupt_to_vcpu(target: Option<CpuMask>, vector: usize) -> AxResult。其中 target 可以控制中断注入的目标 VCpu，是任意一个 VCpu，指定一个 VCpu，指定一组 VCpu，或者所有 VCpu；vector 是中断向量。放置在 AxVM 中的原因是，中断注入的操作可能需要访问 VGIC 等设备。

为了设备不直接依赖于 AxVM 或者 AxVCpu，虚拟设备结构体不能直接调用 inject_interrupt_to_vcpu，而是应当通过提供给设备的一个闭包来实现中断注入。

系统时钟和虚拟设备等中断通过全虚拟化方式实现，每个 `vcpu` 都有一个中断向量表，用于记录客户机中断号对应的中断状态。

当虚拟设备触发中断时，向物理中断控制器发送软中断，由物理中断控制器将中断请求转发到 `vcpu`。

### `inject_interrupt_to_vcpu` 的实现

为了保持 AxVM 的架构无关性，AxVCpu 和 AxArchVCpu 仍然应该提供一个 inject_interrupt 方法，用以向当前 VCpu 注入中断。AxVM 的 inject_interrupt_to_vcpu 方法应该根据 target 参数，调用对应 AxVCpu 的 inject_interrupt 方法。在 aarch64 和 riscv64 平台上，AxArchVCpu 在 setup 时，应该通过 SetupConfig 得到一个实际完成中断注入的闭包；而在 x86 平台上，AxArchVCpu 本身具有中断注入的能力，因此无需进一步的配置。

当被注入中断时，如果 VCpu 正在当前核心上运行，可以直接通过各个架构的虚拟化机制注入中断；如果 VCpu 处于当前核心就绪队列中，则应该记录中断，等 VCpu 下次运行时再注入；如果 VCpu 在非当前核心上运行，可以通过 IPI 通知目标核心的 Hypervisor，由 Hypervisor 负责注入中断。

## 参考资料

* Intel® 64 and IA-32 Architectures Software Developer’s Manual, Volum 3C: CHAPTER 30 APIC VIRTUALIZATION AND VIRTUAL INTERRUPTS
* [ARM Generic Interrupt Controller Architecture version 2.0 - Architecture Specification](https://developer.arm.com/documentation/ihi0048/latest/)
* [Arm Generic Interrupt Controller (GIC) Architecture Specification GIC architecture version 3 and version 4](https://developer.arm.com/documentation/ihi0069/latest/)
* https://github.com/riscv/riscv-plic-spec/blob/master/riscv-plic.adoc