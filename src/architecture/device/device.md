* [axdevice](https://github.com/arceos-hypervisor/axdevice): a module of ArceOS, provides device emulation support
    * partially architecture-independent
    * different emulated device implementations need to be separated into separate crates
        * [x86_vlapic](https://github.com/arceos-hypervisor/x86_vlapic)
        * [arm_vgic](https://github.com/arceos-hypervisor/arm_vgic) (v2,v3,v4)
        * riscv_vplic
        * virtio-blk
        * virtio-net
        * ...
