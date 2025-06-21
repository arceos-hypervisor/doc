# AxVisor
## 概览
[AxVisor](https://github.com/arceos-hypervisor/axvisor/)通过模块化的方式实现了清晰，可扩展，可重用的Hypervisor架构。

`AxVisor`仓库是AxVisor项目的顶层Crate，它作为程序的主入口点将所有组件整合在一起，实现了AxVisor虚拟机监控器(Virtual Machine Manager， VMM)的核心功能。`AxVisor` Crate 提供了一个全局视角的虚拟化资源管理，并负责编排虚拟机的整个生命周期。功能涵盖系统初始化，虚拟机启动，处理运行时事件等等。AxVisor通过统一的框架为多种架构(x86, aarch64和RISC-V)提供支持。


## 设计目标
在深入到具体的设计细节之前，我们将在本节中明确AxVisor的设计目标和功能需求。
基于模块化的设计思路，AxVisor这个Crate是一个调度者，通过调用其它的模块来实现Hypervisor的基本功能，具体的实现细节由下游模块封装。

而作为项目的入口点，`AxVisor`需要实现以下几个功能
1. 系统初始化： 这一部分包括解析配置文件，根据配置文件完成系统和虚拟机的初始化
2. 虚拟机管理： 调用对应的模块启动和终止虚拟机，并为虚拟机提供运行时支持

后文将围绕这两个功能介绍`AxVisor` crate的总体架构

## 总体架构

### 架构概览

模块化设计原则使得AxVisor crate的架构非常清晰。

一方面。 它依赖ArceOS unikernel基座实现了Hypervisor资源管理的基本功能，如内存管理，设备管理，任务调度。另一方面，它依赖`axvm`模块实现了对虚拟机实例的管理，如虚拟机实例的创建，销毁，启动，终止。`AxVisor` 作为核心管理者对硬件资源进行维护的同时也维护各个虚拟机的配置，状态等信息。

![AxVisor Architecture](../assets/axvisor/Axvisor.png)

### 基本抽象模型

要理解Hypervisor的基本架构，一个关键是理解Hypervisor和操作系统抽象模型的区别。

![Hypervisor vs. Operating System](../assets/axvisor/hypervisorvsos.png)

对于操作系统来说，它管理所有的硬件资源并且对所有的硬件资源进行了一层抽象提供给应用程序使用：通过虚拟内存为应用程序提供了内存的抽象，通过线程为应用程序提供了CPU核心计算资源的抽象。

对于Hypervisor来说，它也对所有的硬件资源进行了一层抽象，不过这层抽象是提供给在Hypervisor上运行的操作系统使用。VMM对物理资源的虚拟可以归结为三个主要任务:处理器虚拟化、内存虚拟化和I/O虚拟化。

Hypervisor和操作系统提供的抽象中的主要不同是处理器虚拟化提供的虚拟CPU(Virtual CPU, vCPU)。由于虚拟机中的操作系统需要控制所有计算资源，因此Hypervisor需要给每个虚拟机都至少分配一个CPU核心，但我们显然不希望一台宿主机上运行的虚拟机实例被CPU核心数量所限制。因此，Hypervisor选择对CPU核心进行虚拟化，给每个VM实例提供vCPU。 这样宿主机上运行的虚拟机实例数量就和物理核心数量解耦。

理解了这个抽象模型，就可以比较容易理解`AxVisor`中的架构了。在`AxVisor`中，我们将物理CPU核心虚拟化为了vCPU核心给虚拟机使用，每个虚拟机至少对应一个vCPU核心。由于操作系统本身也是一段程序，因此管理多个操作系统实际上和管理多个进程是完全一样的。我们通过中断来让Hypervisor接管系统，并调度合适的vCPU到合适的物理CPU核心上执行。从而实现多个虚拟机复用物理资源。在后文中我们也会详细介绍AxVisor的vCPU实现


## 工作流程

在本小节中，我们将以AxVisor一次完整的运行流程为引子，详细介绍AxVisor VMM的实现。
以下代码是定义在`AxVisor/src/main/rs`的中的`main()`函数，它主要完成了三项任务

1. 在`hal::enable_virtualization()`完成了硬件初始化
2. 在`vmm::init()`完成了VMM初始化
3. 在`vmm::start()`启动了VMM管理的虚拟机实例并提供运行时支持

```rust
fn main() {
    hal::enable_virtualization();
    vmm::init();
    vmm::start();
}
```

### 系统初始化

AxVisor启动后首先会完成一部分系统初始化。这个步骤的主要内容是为每个CPU核心初始化per-cpu存储空间中的定时器列表并启动CPU核心的硬件虚拟化支持。per-cpu存储空间存储特定CPU的相关数据结构是多核Hypervisor开发中一个常见的设计决策，合理的设计per-cpu数据结构可以有效的避免同步开销并提高访问效率。在AxVisor中per-cpu数据结构中会保存每个CPU的定时器和时钟时间等信息。 
相关代码可参考`axvisor/src/vmm/hal.rs`

### VMM初始化

完成了基本的硬件初始化以后，AxVisor将通过`vmm::init()`进行VMM的初始化。在这个流程中，AxVisor会首先根据`toml`配置文件加载指定的虚拟机实例，然后为每个虚拟机实例分配一个主要虚拟CPU核心(Primary vCPU)用来运行客户机操作系统。AxVisor支持为每个虚拟机配置复数个虚拟CPU核心，但在初始化阶段只会为每个虚拟机实例分配一个vCPU，后续虚拟机在运行阶段可以通过触发`CPU UP`来向VMM申请新的虚拟CPU核心。分配完vCPU后，AxVisor会生成一个绑定了虚拟机实例ID和vCPU的扩展task数据结构并加入到调度队列中，用于后续vCPU的调度。

```rust
pub fn init() {
    // Initialize guest VM according to config file.
    config::init_guest_vms();

    // Setup vcpus, spawn axtask for primary VCpu.
    info!("Setting up vcpus...");
    for vm in vm_list::get_vm_list() {
        vcpus::setup_vm_primary_vcpu(vm);
    }
}
```

相关代码可参考`axvisor/src/vmm/mod.rs`和`axvisor/src/vmm/vcpus.rs`

### 基于axtask的vCPU调度

AxVisor实现了vCPU状态管理和调度解耦。通过vCPU模块维护每个架构的vCPU实现，vCPU需要正确虚拟化异常处理，定义上下文帧结构，并保存寄存器等信息，并处理与物理CPU的交互。具体实现课参考每个架构的vCPU模块。

在调度方面，AxVisor借助了axteask提供的Task扩展(Task Ext)接口为Task绑定了虚拟机实例和vCPU的ID，从而复用ArceOS的axtask调度器为各个虚拟机实例的vcpu提供调度。
对于单核系统，axtask模块将所有vCPU放入统一的调度队列中进行管理。对于多核系统AxVisor支持通过掩码的方式为vCPU设置物理CPU亲和性，在调度过程中axtask根据掩码将虚拟机实例的任务插入到对应物理核心的调度队列中去。

```rust
pub(crate) fn select_run_queue<G: BaseGuard>(task: &AxTaskRef) -> AxRunQueueRef<'static, G> {
    let irq_state = G::acquire();
    #[cfg(not(feature = "smp"))]
    {
        let _ = task;
        // When SMP is disabled, all tasks are scheduled on the same global run queue.
        AxRunQueueRef {
            inner: unsafe { RUN_QUEUE.current_ref_mut_raw() },
            state: irq_state,
            _phantom: core::marker::PhantomData,
        }
    }
    #[cfg(feature = "smp")]
    {
        // When SMP is enabled, select the run queue based on the task's CPU affinity and load balance.
        let index = select_run_queue_index(task.cpumask());
        AxRunQueueRef {
            inner: get_run_queue(index),
            state: irq_state,
            _phantom: core::marker::PhantomData,
        }
    }
}
```


### 启动虚拟机

在初始化完成后，VMM会通过`vmm::start()`函数启动虚拟机实例的运行，并等待虚拟机实例运行结束。VMM会通过循环对每个虚拟机调用`axvm`模块提供的`boot()`接口将虚拟机的运行状态设置为`running`并唤醒对应的虚拟CPU核心开始运行虚拟机实例。AxVisor通过原子变量`RUNNING_VM_COUNT`统计虚拟机的状态，等待所有虚拟机运行完毕后退出。

```rust
    pub fn start() {
    info!("VMM starting, booting VMs...");
    for vm in vm_list::get_vm_list() {
        match vm.boot() {
            Ok(_) => {
                vcpus::notify_primary_vcpu(vm.id());
                RUNNING_VM_COUNT.fetch_add(1, Ordering::Release);
                info!("VM[{}] boot success", vm.id())
            }
            Err(err) => warn!("VM[{}] boot failed, error {:?}", vm.id(), err),
        }
    }

    // Do not exit until all VMs are stopped.
    task::ax_wait_queue_wait_until(
        &VMM,
        || {
            let vm_count = RUNNING_VM_COUNT.load(Ordering::Acquire);
            info!("a VM exited, current running VM count: {}", vm_count);
            vm_count == 0
        },
        None,
    );
```

相关代码可参考`axvisor/src/vmm/mod.rs`

### 运行时支持

AxVisor通过捕获trap和interrupt的方式为其管理的虚拟机实例提供运行时支持。虚拟机实例中的客户操作系统会运行在较低的特权级之下，如果内部调用了特权指令，硬件会触发异常并帮助我们跳转到AxVisor注册的异常处理函数中交由AxVisor处理。来自外部设备的中断都通过多层次的 VM-Exit 处理例程返回给 AxVisor 进行处理。AxVisor 根据中断号和虚拟机配置文件识别外部中断：如果中断是预留给 AxVisor 的（例如 AxVisor 自己的时钟中断），则由 axhal 提供的 ArceOS 中断处理例程来处理。如果中断属于某个客户虚拟机（例如客户虚拟机的直通磁盘中断），则该中断会直接注入到对应的虚拟机。

- 请注意，一些架构的中断控制器可以配置为在不经过 VM-Exit 的情况下直接将外部中断注入到虚拟机中（例如 x86 提供的已发布中断）

下面的代码片段列举了AxVisor处理异常的基本框架，具体实现与体系结构相关，请参考各体系结构的vcpu文档。

```rust
match vm.run_vcpu(vcpu_id) {}
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
        ...
    }
```







