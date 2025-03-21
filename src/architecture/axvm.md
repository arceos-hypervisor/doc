# [AxVM](https://github.com/arceos-hypervisor/axvm): resource management within each VM

WIP 🚧

* address space of guest VM
* axvcpu list
* axdevice list

```rust
/// A Virtual Machine.
pub struct AxVM<H: AxVMHal, U: AxVCpuHal> {
    running: AtomicBool,
    inner_const: AxVMInnerConst<U>,
    inner_mut: AxVMInnerMut<H>,
}

struct AxVMInnerConst<U: AxVCpuHal> {
    id: usize,
    config: AxVMConfig,
    vcpu_list: Box<[AxVCpuRef<U>]>,
    devices: AxVmDevices,
}

struct AxVMInnerMut<H: AxVMHal> {
    // Todo: use more efficient lock.
    address_space: Mutex<AddrSpace<H::PagingHandler>>,
    _marker: core::marker::PhantomData<H>,
}
```

