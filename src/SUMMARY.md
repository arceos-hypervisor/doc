# AxVisor Book

# 关于 AxVisor

- [概述](./overview/overview.md)

- [硬件平台支持](./overview/platform.md)

- [客户机系统支持](overview/guest.md)

# 快速上手

- [QEMU](./quickstart/qemu/qemu.md)
    - [QEMU-aarch64](./quickstart/qemu/qemu_aarch64.md)
    - [QEMU-x86_64](./quickstart/qemu/qemu_x86_64.md)
    - [QEMU-riscv64](./quickstart/qemu/qemu_riscv64.md)

- [黑芝麻 A1000](./quickstart/aarch64_a1000.md)

- [RK3588](./quickstart/aarch64_rk3588.md)

- [ROC-RK3568-PC](./quickstart/aarch64_roc-rk3568-pc.md)

# 架构设计手册

- [总体设计](./architecture/arch.md)

- [AxVisor](./architecture/axvisor.md)

- [AxVisor API](./architecture/axvisor_api/comparison.md)

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

- [测试](./architecture/test/test.md)

# 开发指导手册

- [构建](./development/build.md)

- [硬件适配](./development/platform_port/platform_port.md)

- [客户机适配](./development/guest_vms/guest_vms.md)

    - [2 VM Timer Nimbos](./development/guest_vms/2vm_timer.md)

- [文档](./development/docs/docs.md)
    - [国际化](./development/docs/i18n.md)

# 用户指导手册

- [使用](./user_manual/usage.md)

- [管理](./user_manual/manage.md)

- [部署](./user_manual/depoly.md)

# 开发计划

- [Roadmap](./roadmap/roadmap.md)

- [Discussions](./roadmap/discusstions.md)
