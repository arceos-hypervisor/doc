## 客户机系统支持

目前，AxVisor 已经在对如下系统作为客户机的情况进行了验证。

### ArceOS

[ArceOS](https://github.com/arceos-org/arceos) 是一个用 Rust 编写的专为嵌入式系统和物联网设备设计的轻量级操作系统，提供简单、高效、可定制的功能，适合需要实时响应和低资源开销的应用场景。
### Starry-OS

[Starry-OS](https://github.com/Starry-OS) 是一款轻量级、模块化且高效的操作系统，专为嵌入式系统和物联网设备设计。它具有实时性支持、跨平台能力以及灵活的定制选项，适合在资源受限的环境中运行。

### NimbOS

[NimbOS](https://github.com/equation314/nimbos) 是一款用 Rust 编写的专为资源受限环境和嵌入式设备设计的实时操作系统，具有轻量化、实时支持、低功耗、模块化架构等优点。

### Linux

* currently only Linux with passthrough device on aarch64 is tested.
* single core: [config.toml](configs/vms/linux-qemu-aarch64.toml) | [dts](configs/vms/linux-qemu.dts)
* smp: [config.toml](configs/vms/linux-qemu-aarch64-smp2.toml) | [dts](configs/vms/linux-qemu-smp2.dts)
