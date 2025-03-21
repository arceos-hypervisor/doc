# AxVisor

## The unified modular hypervisor based on [ArceOS](https://github.com/arceos-org/arceos).

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

![](./assets/arceos.png)
