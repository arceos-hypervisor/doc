# AxVisor

[AxVisor]((https://github.com/arceos-hypervisor/axvisor/)) 作为虚拟机监控器（VMM）运行，构建并作为 ArceOS 独立内核应用程序运行。

<div align="center">
<img src="../assets/arceos-hv-dep.svg" width="125%">
</div>

如上依赖关系图所示，它提供了一个全局视角的虚拟化资源管理，作为连接 ArceOS 核心功能组件与虚拟化相关组件的桥梁。

一方面，它直接依赖于 ArceOS 提供的 axstd 库，调用 ArceOS 的核心功能。一些直接的依赖包括：

* ​[axtask](https://arceos.org/arceos/axtask/index.html) based vCpu management and scheduling
* [axhal](https://arceos.org/arceos/axhal/index.html) for platform-specific operations and interrupt handling
* [axconfig](https://arceos.org/arceos/axconfig/index.html) for platform configuration

另一方面，它依赖于 [axvm](./axvm.md) 来实现虚拟机管理（配置与运行时），包括：

* ​CRUD operations for guest VMs
* ​VM lifecycle control: setup, boot, notification and shutdown
* Hypercall handling for communication between hypervisor and guest VMs

## VM 管理

* hypercall handler
* GLOBAL_VM_LIST

## 基于 axtask 的 vCPU 调度

[axvcpu](./vcpu/vcpu.md) 仅负责虚拟化功能支持，例如通过 vmlaunch/vmexit 进入/退出客户机。

由于 ArceOS 已经提供了 axtask 用于在单一特权级别下进行运行时控制流管理，我们可以重用其调度器并与之共同发展。

在虚拟机启动和设置过程中，axvisor 为每个 vCPU 分配 axtask，将任务的入口函数设置为 `vcpu_run()`，如果 vCPU 有专用的物理 CPU 集，它还会初始化 CPU 掩码。

### `vcpu_run()`

`vcpu_run()` 函数是 vCPU 任务的主要例程，可以总结如下：

```rust
fn vcpu_run() {
    let curr = axtask::current();

    let vm = curr.task_ext().vm.clone();
    let vcpu = curr.task_ext().vcpu.clone();

    loop {
        match vm.run_vcpu(vcpu_id) {
            // match vcpu.run() {
            Ok(exit_reason) => match exit_reason {
                AxVCpuExitReason::Hypercall { nr, args } => {}
                }
                AxVCpuExitReason::ExternalInterrupt { vector } => {
                    // Irq injection logic
                }
                AxVCpuExitReason::Halt => {
                    wait(vm_id)
                }
                AxVCpuExitReason::Nothing => {}
                AxVCpuExitReason::CpuDown { _state } => {
                    // Sleep target axtask.
                }
                AxVCpuExitReason::CpuUp {
                    target_cpu,
                    entry_point,
                    arg,
                } => {
                    // Spawn axtask for target vCpu.
                    vcpu_on(vm.clone(), target_cpu as _, entry_point, arg as _);
                    vcpu.set_gpr(0, 0);
                }
                AxVCpuExitReason::SystemDown => {}
                _ => {
                    warn!("Unhandled VM-Exit");
                }
            },
            Err(err) => {}
        }
    }
}
```

### Task 扩展

该机制允许调用者在不修改 axtask 结构体源代码的情况下自定义其扩展字段，（这是一种类似于线程局部存储（TLS）的轻量级机制）。

<!-- Core design principles: -->

axtask 结构体的基本字段: 

* 任务执行所需的基本信息，包括函数调用上下文、栈指针以及其他运行时元数据。

使用场景
* 宏内核的扩展
    * Process metadata (e.g., PID)
    * Memory management informations like page table
    * Resource management including fd table
    * ...
* hypervisor 扩展
    * vCPU state
    * Metadata of the associated VM
    * ...

#### Task 扩展设计

* 将 `task_ext_ptr` 引入作为扩展字段
* 利用基于指针的访问方式，实现与原生结构体字段相当的内存访问性能。
* 通过 [def_task_ext](https://arceos.org/arceos/axtask/macro.def_task_ext.html) 在编译时确定扩展字段的大小。 
* 在堆上分配内存，将扩展字段指针 `task_ext_ptr` 设置为该内存块。
* 暴露引用 API 供外部访问
* 由 `init_task_ext` 初始化

```rust
// arceos/modules/axtask/src/task_ext.rs
#[unsafe(no_mangle)]
static __AX_TASK_EXT_SIZE: usize = ::core::mem::size_of::<TaskExt>();
#[unsafe(no_mangle)]
static __AX_TASK_EXT_ALIGN: usize = ::core::mem::align_of::<TaskExt>();

pub trait TaskExtRef<T: Sized> {
    /// Get a reference to the task extended data.
    fn task_ext(&self) -> &T;
}

impl ::axtask::TaskExtRef<TaskExt> for ::axtask::TaskInner {
    fn task_ext(&self) -> &TaskExt {
        unsafe {
            let ptr = self.task_ext_ptr() as *const TaskExt;
            if !!ptr.is_null() {
                ::core::panicking::panic("assertion failed: !ptr.is_null()")
            };
            &*ptr
        }
    }
}

// arceos/modules/axtask/src/task.rs
impl TaskInner {
        /// Returns the pointer to the user-defined task extended data.
    ///
    /// # Safety
    ///
    /// The caller should not access the pointer directly, use [`TaskExtRef::task_ext`]
    /// or [`TaskExtMut::task_ext_mut`] instead.
    ///
    /// [`TaskExtRef::task_ext`]: crate::task_ext::TaskExtRef::task_ext
    /// [`TaskExtMut::task_ext_mut`]: crate::task_ext::TaskExtMut::task_ext_mut
    pub unsafe fn task_ext_ptr(&self) -> *mut u8 {
        self.task_ext.as_ptr()
    }

    /// Initialize the user-defined task extended data.
    ///
    /// Returns a reference to the task extended data if it has not been
    /// initialized yet (empty), otherwise returns [`None`].
    pub fn init_task_ext<T: Sized>(&mut self, data: T) -> Option<&T> {
        if self.task_ext.is_empty() {
            self.task_ext.write(data).map(|data| &*data)
        } else {
            None
        }
    }
}

```


#### `TaskExt` in axvisor

```rust
// axvisor/src/task.rs
use std::os::arceos::modules::axtask::def_task_ext;

use crate::vmm::{VCpuRef, VMRef};

/// Task extended data for the hypervisor.
pub struct TaskExt {
    /// The VM.
    pub vm: VMRef,
    /// The virtual memory address space.
    pub vcpu: VCpuRef,
}

impl TaskExt {
    pub const fn new(vm: VMRef, vcpu: VCpuRef) -> Self {
        Self { vm, vcpu }
    }
}

def_task_ext!(TaskExt);

// axvisor/src/vmm/vcpus.rs
fn alloc_vcpu_task(vm: VMRef, vcpu: VCpuRef) -> AxTaskRef {
    let mut vcpu_task = TaskInner::new(
        vcpu_run,
        format!("VM[{}]-VCpu[{}]", vm.id(), vcpu.id()),
        KERNEL_STACK_SIZE,
    );
    // ...
    vcpu_task.init_task_ext(TaskExt::new(vm, vcpu));
    axtask::spawn_task(vcpu_task)
}
```

## irq & timer

### External Interrupt

所有来自外部设备的中断都通过多层次的 VM-Exit 处理例程返回给 axvisor 进行处理。因为 只有 axvisor 拥有全局资源管理视角。

axvisor 根据中断号和虚拟机配置文件识别外部中断：
* 如果中断是预留给 axvisor 的（例如 axvisor 自己的时钟中断），则由 axhal 提供的 ArceOS 中断处理例程来处理。

* 如果中断属于某个客户虚拟机（例如客户虚拟机的直通磁盘中断），则该中断会直接注入到对应的虚拟机。
    * 请注意，一些架构的中断控制器可以配置为在不经过 VM-Exit 的情况下直接将外部中断注入到虚拟机中（例如 x86 提供的已发布中断）

### Timer

草拟设计请参考 [discussion#36](https://github.com/orgs/arceos-hypervisor/discussions/36#discussioncomment-11002988)。
