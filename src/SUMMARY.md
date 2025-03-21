# AxVisor Book

# 关于 AxVisor

- [概述](./overview/overview.md)

- [硬件平台支持](./overview/platform.md)

- [客户机系统支持](overview/guest.md)

# 快速上手

- [QEMU AArch64](./quickstart/qemu_aarch64.md)

- [黑芝麻 A1000](./quickstart/a1000.md)

- [RK3588](./quickstart/rk3568.md)

- [ROC-RK3568-PC](./quickstart/roc-rk3568-pc.md)

- [其他硬件](./quickstart/others.md)

# 架构设计手册

- [总体设计](./architecture/arch_cn.md)

- [AxVisor API](./architecture/axvisor_api/comparison.md)

- [AxVisor](./architecture/axvisor.md)

- [axvm](./architecture/axvm.md)

- [axvcpu](./architecture/vcpu/vcpu.md)
    - [x86_vcpu](./architecture/vcpu/x86_vcpu.md)
    - [arm_vcpu](./architecture/vcpu/arm_vcpu.md)
    - [riscv_vcpu](./architecture/vcpu/riscv_vcpu.md)
    - [loongarch_vcpu](./architecture/vcpu/loongarch_vcpu.md)

- [axaddrspace](./architecture/memory.md)

- [Virtual IRQ](./architecture/irq/irq.md)
    - [vGIC](./architecture/irq/vgic.md)
    - [vLapic](./architecture/irq/vlapic.md)

- [Passthrough Device](./architecture/device/passthrough_device.md)

- [Emulated Device](./architecture/device/device.md)
    - [emulated PCI](./architecture/device/pci.md)
    - [virtio device](./architecture/device/virtio.md)

- [VM-Exit](./architecture/multi_layer_VM-Exit.md)

# 开发指导手册

- [构建](./development/index_cn.md)

- [硬件适配](./development/platform_port/platform_port.md)

    - [A1000](./development/platform_port/a1000_linux&arceos.md)

    - [RK3588](./development/platform_port/rk3588.md)

- [客户机适配](./development/guest_vms/guest_vms.md)

    - [Guest Linux](./development/guest_vms/linux.md)

    - [2 Guest ArceOS + Linux](./development/guest_vms/2vm_arceos_linux.md)  

    - [2 VM Timer Nimbos](./development/guest_vms/2vm_timer.md)

# 用户指导手册

- [使用](./user_manual/index.md)

- [管理](./user_manual/manage.md)

- [部署](./user_manual/depoly.md)

# 开发计划

- [Roadmap](./roadmap/roadmap.md)

- [Discussions](./roadmap/discusstions.md)