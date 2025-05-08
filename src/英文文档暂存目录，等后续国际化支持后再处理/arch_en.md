# AxVisor: The unified modular hypervisor based on [ArceOS](https://github.com/arceos-org/arceos).

[discussion](https://github.com/orgs/arceos-hypervisor/discussions/7)


<!-- ## Design Goal -->

This project originated from the [discussion/13](https://github.com/orgs/rcore-os/discussions/13) of [rCore-OS](https://github.com/rcore-os) community.

* add virtualization support crates/modules based on ArceOS unikernel

* build a modular hypervisor that supports multiple architectures based on the basic OS functions
* hope to make the hypervisor as modular as possible and minimize modifications to the arceos kernel code.



## [ArceOS](https://github.com/arceos-org/arceos)

* An experimental modular OS in Rust.
* basic architecture: **unikernel**
* modules/crates
    * kernel-dependent modules
        * axtask,axdriver,...
    * Kernel-independent crates
        * buddy allocator, page_table...

![](../assets/arceos.png)



## Heterogeneous expansion based on arceos kernel components

![](../assets/arceos-hypervisor-architecture.png)

* Kernel Backbone: arceos components
* Monolithic  kernel extension: [starry-next](https://github.com/arceos-org/starry-next)
    * process address space management
    * process abstraction
    * syscall support
* Hypervisor extension: [arceos-hypervisor](https://github.com/arceos-hypervisor/arceos-umhv/)
    * VM address space management
    * emulated devices (interrupts, serial ports, etc.)
    * VM exit interface support



## arceos-umhv

Unified modular ArceOS hypervisor, mainly composed of the following independent components:

<!-- * [vmm-app](https://github.com/arceos-hypervisor/arceos-umhv/tree/master/arceos-vmm): acts like a VMM (Virtual Machine Monitor)

* [axvm](https://github.com/arceos-hypervisor/arceos-umhv/tree/master/crates/axvm): responsible for **resource management** within each VM

* [axvcpu](https://github.com/arceos-hypervisor/axvcpu): provides CPU virtualization support


* [axdevice](https://github.com/arceos-hypervisor/axdevice): provides device emulation support


* [axaddrspace](https://github.com/arceos-hypervisor/axaddrspace): provides guest VM address space management -->

* [axvisor](https://github.com/arceos-hypervisor/axvisor/)

* [axvm](https://github.com/arceos-hypervisor/arceos-umhv/tree/master/crates/axvm)
* [axvcpu](https://github.com/arceos-hypervisor/axvcpu)


* [axdevice](https://github.com/arceos-hypervisor/axdevice)


* [axaddrspace](https://github.com/arceos-hypervisor/axaddrspace)


![](../assets/arceos-hypervisor-architecture.png)




## Components

* [axvcpu](https://github.com/arceos-hypervisor/axvcpu): provides CPU virtualization support
    * highly architecture-dependent
    * stores exception context frame of different architecture
    * basic scheduling item
    * arch-specific vcpu implementations need to be separated into separate crates:
        * [arm_vcpu](https://github.com/arceos-hypervisor/arm_vcpu)
        * [x86_vcpu](https://github.com/arceos-hypervisor/x86_vcpu)
        * [riscv_vcpu](https://github.com/arceos-hypervisor/riscv_vcpu)
        * ...


## Components

* [axdevice](https://github.com/arceos-hypervisor/axdevice): a module of ArceOS, provides device emulation support
    * partially architecture-independent
    * different emulated device implementations need to be separated into separate crates
        * [x86_vlapic](https://github.com/arceos-hypervisor/x86_vlapic)
        * [arm_vgic](https://github.com/arceos-hypervisor/arm_vgic) (v2,v3,v4)
        * riscv_vplic
        * virtio-blk
        * virtio-net
        * ...


## Components

* [axaddrspace](https://github.com/arceos-hypervisor/axaddrspace): provides guest VM address space management
    * nested page table implementation for different architectures
    * maybe combined with process virtual address space management 
    * responsible for managing and mapping the guest VM's second-stage address space (GPA -> HPA)
    * implemented based on ArceOS crates: 
        * [page_table_entry](https://crates.io/crates/page_table_entry)
        * [page_table_multiarch](https://crates.io/crates/page_table_multiarch)



## Components

* [axvm](https://github.com/arceos-hypervisor/arceos-umhv/tree/master/crates/axvm): responsible for **resource management** within each VM
    * partially architecture-independent
    * a instance of guest virtual machine
    * resources:
        * address space of guest VM
        * axvcpu list
        * axdevice list



## Components

* [axvisor](https://github.com/arceos-hypervisor/axvisor/): acts like a VMM (Virtual Machine Monitor)
    * As an ArceOS unikernel app, directly call arceos functions
    * completely architecture-independent
    * responsible for VM management (configuration & runtime)



## VCpu Scheduling : based on axtask

<!-- axvcpu is just and only reponsible virtualization function support, e.g. enter/exit guest VM through vmlaunch/vmexit.

Since ArceOS already provides axtask for runtime control flow mangement under single privilege level, 
we can reuse its scheduler and evolve with it.

VCpu scheduling upon ArceOS may looks like this: -->

``` Rust
    for vcpu in vm.vcpu_list() {
        axtask::spawn(|| {
                let curr = axtask::current();
                let vcpu = unsafe { curr.task_ext().vcpu.clone() };
                let vm = unsafe { curr.task_ext().vm.clone() };
                loop {
                    let exit_reason = vcpu.run();
                    match exit_reason {
                        MMIO(emu_ctx) => vm.handle_device(emu_ctx),
                        HVC(emu_ctx) => vm.handle_hvc(emu_ctx),
                        EXIT(code) => axtask::exit(code),
                        ...
                    }
                }
            }
        );
    }
```

<!-- * converge all interactions with the guest privilege level within the `vcpu.run()` function, so that a `loop` block can handle all access from guest VM. -->




### Exception (VM-Exit) Handling


The vcpu scheduling design mentioned above requires a reasonable exception (VM-Exit) handling framework.


* x86_64
    * host-state area of the VMCS can flexibly determine the `rip` value after a VM-Exit occurs
    * Therefore, we can save the context properly in the host sp during `vmlaunch/resume`, store the host sp pointer, and pop the context from the host sp in the `vmx_exit` function when a VM-Exit occurs. All of these operations are performed in vmx mod, which elegantly limits the interaction with the guest VM to the `vcpu.run()` function.




### Exception (VM-Exit) Handling


The vcpu scheduling design mentioned above requires a reasonable exception (VM-Exit) handling framework.

* aarch64

    * [`VBAR_EL2`](https://developer.arm.com/documentation/ddi0601/2020-12/AArch64-Registers/VBAR-EL2--Vector-Base-Address-Register--EL2-) register holds the vector base address 
    * to run arceos in EL2 to support virtualization, we need to make intrusive modifications to arceos's [axhal module](https://github.com/arceos-org/arceos/tree/main/modules/axhal).
    * save callee saved registers in EL2's stack manually

    <!-- * For VM-Entry
        * `arch_vcpu.run()`
        * save callee saved registers (EL2)
        * pass context frame pointer, something like `&vcpu.vm_context_frame`
        * recore VM context from `&vcpu.vm_context_frame`, including
            * status register
            * general register
        * eret
    * For VM-Exit
        * exception handler
        * get pointer of current vcpu's context frame pointer
        * store VM context into `&current_vcpu.vm_context_frame`, including
            * status register
            * general register
        * pop callee saved registers (EL2)
        * back to `arch_vcpu.run()` -->



### Multilayer VM-Exit handling

VM-Exits in x86_64, aarch64 and riscv64 follow the same design logic but share a slightly different implementation.

* Inner-VCpu handling
    * e.g. under x86_64, some VM-Exit items are architecture specific (`CR_ACCESS`, `CPUID`)
* Inner-VM handling
    * leaving device emulation related and page-fault related VM-Exits inside axvm
* (Outer-VM)vmm-app handling
    * including the handling of hypercalls (handling this within the VMM also seems quite reasonable) and any (if-any) VM-Exit types that require vCPU scheduling or vCPU exit

<!-- 

### Exception Type (VM-Exit Reason)

* architecture independent
* reference: [KVM exit reasion](https://docs.rs/kvm-ioctls/0.17.0/kvm_ioctls/enum.VcpuExit.html)
* current implementation [crates/axvm/src/vcpu.rs](https://github.com/arceos-hypervisor/arceos-umhv/blob/master/crates/axvm/src/vcpu.rs) -->



## Memory Management

* similar to the address space management of the [arceos-monolithic](https://github.com/arceos-org/arceos/tree/monolithickernel-new/).


* take advantage of crate [memory_set](https://github.com/arceos-org/arceos/tree/monolithickernel-new/crates/memory_set) and register the PageTable as our [AxNestPageTable](https://github.com/arceos-hypervisor/arceos-umhv/blob/master/crates/axvm/src/mm/npt.rs).

```rust
/// The virtual memory address space.
pub struct AddrSpace<H: PagingHandler> {
    va_range: GuestPhysAddrRange,
    areas: MemorySet<Backend<H>>,
    pt: PageTable<H>,
}
```

> we hope to find a way to unify address space management for both monolithic and hypervisor variants of ArceOS.





## Emulated Device

`axdevice` crate provides struct like `AxEmulatedDevices`, which will be owned and managed by `AxVM`.

```Rust
pub struct AxEmulatedDevices {
    mmio_devices: BTreeMap<Range<usize>, dyn EmuDev>,
    #[cfg(target_arch = "x86_64")]
    pio_devices: BTreeMap<Range<usize>, dyn EmuDev>,
}

pub trait EmuDev {
    fn emu_type(&self) -> EmuDeviceType;
    fn address_range(&self) -> Range<usize>;
    fn handler(&self, ctx: &AccessContext) -> AxResult;
}
```

<!-- When a VM-Exit caused by MMIO (or PIO) access occurs, `axvcpu` will record the current access information, including address, bit width, read/write, etc. The `emulated_device_handler` function of axdevice needs to find the corresponding emulated device according to the access address, call the corresponding device's processing function and pass in the access information.

Providing emulated device support for guest VMs requires considerable work.
Currently we focus on [emulated interrupt controller](https://github.com/arceos-hypervisor/arceos-hypervisor-docs/blob/master/devices/emulated_interrupt_controller.md) for different architectures and virtio-devices (mainly [Virtio-Blk](https://github.com/arceos-hypervisor/arceos-hypervisor-docs/blob/master/devices/virtio_blk.md)). -->



## Dependency diagram

![](../assets/arceos-hv-dep.svg)

<!-- * Note: we aim to consolidate all dependencies on ArceOS within the vmm-app -->
Since modules/crates used for virtualization functionality in the AxVisor architecture need to call OS-related resource management interfaces, **while we aim to consolidate all OS-related dependencies within the vmm-app**.

Various modules/crates will achieve dependency injection through Rust traits.



## Example about how we achieve dependency injection

Taking [`axaddrspace`](https://github.com/arceos-hypervisor/axaddrspace) for an example, its [`AddrSpace`](https://github.com/arceos-hypervisor/axaddrspace/blob/d377e5aa4eb06afa50a3a901ec3239559be1eb51/src/address_space.rs#L16C12-L16C21) represents memory regions and two-stage address mapping for guest VM, which relies on a generic type `PagingHandler` for page table related stuff.

```Rust
/// The virtual memory address space.
pub struct AddrSpace<H: PagingHandler> {
    va_range: VirtAddrRange,
    areas: MemorySet<MappingFlags, PageTable<H>, Backend>,
    pt: PageTable<H>,
}
```


## Example about how we achieve dependency injection

`axaddrspace` is owned and managed by `axvm`'s `AxVM` structure, which replies on `AxVMHal` trait ( defined in `axvm`'s [hal.rs](https://github.com/arceos-hypervisor/axvm/blob/master/src/hal.rs) ) .

Indeed, `PagingHandler` is a associate type of `AxVMHal` trait.

```Rust
/// The interfaces which the underlying software (kernel or hypervisor) must implement.
pub trait AxVMHal: Sized {
    type PagingHandler: page_table_multiarch::PagingHandler;
    /// Converts a virtual address to the corresponding physical address.
    fn virt_to_phys(vaddr: HostVirtAddr) -> HostPhysAddr;
    /// Current time in nanoseconds.
    fn current_time_nanos() -> u64;
	// ...
}
```



## Example about how we achieve dependency injection

While `AxVMHal` is implemented by `AxVMHalImpl` in vmm-app, which rely on `PagingHandlerImpl` from `ArceOS`'s `axhal` module to implement its associate type `PagingHandler`.

```Rust
pub struct AxVMHalImpl;

impl AxVMHal for AxVMHalImpl {
    type PagingHandler = axhal::paging::PagingHandlerImpl;
    fn virt_to_phys(vaddr: VirtAddr) -> PhysAddr {
        axhal::mem::virt_to_phys(vaddr)
    }
    fn current_time_nanos() -> u64 {
        axhal::time::monotonic_time_nanos()
    }
	// ...
}
```



## Dependency injection


So, current design achieve dependency injection through Rust's generic type (`Trait`) and its associate type mechanism.

For other virtualization-related modules/crates such as `axvcpu`, `axdevice`, etc., 
we also want them to expose well-designed generics, and to converge these carefully crafted generics as subtraits or associated types within the `AxVmHal trait` of `axvm` (since `axvm` is reponsible for VM resource management). 

Ultimately, the `vmm-app` layer will call the relevant functionalities of `ArceOS` to implement them.


