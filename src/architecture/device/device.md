* [axdevice](https://github.com/arceos-hypervisor/axdevice) 是 ArceOS 的一个模块，提供设备仿真支持
    * 部分架构独立
    * 不同的仿真设备实现需要被分离到独立的 crate 中
        * [x86_vlapic](https://github.com/arceos-hypervisor/x86_vlapic)
        * [arm_vgic](https://github.com/arceos-hypervisor/arm_vgic) (v2,v3,v4)
        * riscv_vplic
        * virtio-blk
        * virtio-net
        * ...
