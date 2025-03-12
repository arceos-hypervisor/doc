# AxVisor Architecture Book

[Introduction](./Introduction.md) 胡柯洋

# About AxVisor

- [Arch & Platform](./platform.md) 苏明贤  

- [Quick Start](./start/index_cn.md) 苏明贤
    - [How-to](./start/How-to.md)  胡柯洋
    - [Guest Linux](./start/linux_cn.md) 苏明贤
    - [2 Guest ArceOS + Linux](./start/2vm_arceos_linux.md)  胡柯洋

# Overall Architecture


- [AxVisor 设计文档](./arch_cn.md) 苏明贤
- [AxVisor Overall Arch](./arch_en.md) 胡柯洋
- [Supported Guest VMs](./gvm.md) 苏明贤

# Components

- [vCpu](./vcpu/vcpu.md) 郭伟康
    - [x86_vcpu](./vcpu/x86_vcpu.md) 杨金全
    - [arm_vcpu](./vcpu/arm_vcpu.md) 罗徳斌
    - [riscv_vcpu](./vcpu/riscv_vcpu.md) 石磊
    - [loongarch_vcpu](./vcpu/loongarch_vcpu.md) 肖辉

- [Memory](./memory.md) 宋志勇

- [Virtual IRQ](./irq/irq.md) 周睿 
    - [vGIC](./irq/vgic.md) 罗徳斌
    - [vLapic](./irq/vlapic.md) 周睿

- [Passthrough Device](./device/passthrough_device.md) 杨金全

- [Emulated Device](./device/device.md) 郭伟康
    - [emulated PCI](./device/pci.md) 柏乔森
    - [virtio device](./device/virtio.md) 肖辉

- [VM-Exit](./designs/multi_layer_VM-Exit.md) 柏乔森 

- [测试评价](./testing/test_overview.md) 杨坤
    - [测试环境](./testing/test_env.md)杨坤
    - [测试内容](./testing/benchmarks.md)杨坤

# Discussions
- [Discusstions](./discusstions.md) 胡柯洋

