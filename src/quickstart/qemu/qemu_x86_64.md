# Run AxVisor on QEMU x86_64

目前，在 qemu-system-x86_64 平台上已经对独立运行 ArceOS, Nimbos 以及 Starry 进行验证。

## axvm-bios

[axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 是针对 x86_64 用户虚拟机的一个极简BIOS实现。

它可以承担引导 NimbOS 以及 ArceOS 启动的任务，二进制文件[链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin).

## Guest VM configuration

需要修改 guest VM 的配置文件 `xxx-x86_64.toml` 中的 `bios_path` 以及 `bios_load_addr` 域，可参考 [arceos-x86_64.toml](https://github.com/arceos-hypervisor/axvisor/blob/master/configs/vms/arceos-x86_64.toml)。

```toml
#
# Vm kernel configs
#
[kernel]
# ...
# The file path of the BIOS image.
bios_path = "axvm-bios.bin"
# The load address of the BIOS image.
bios_load_addr = 0x8000
```

## QEMU arguments

目前 qemu-system-x86_64 平台提供的 virt CPU 实现不支持 VMX feature，需要在启动时开启 `-enable-kvm` 参数（Makefile 定义的环境变量为 `ACCEL=y`）。

参考运行命令：

```bash
make ACCEL=y ARCH=x86_64 LOG=info VM_CONFIGS=configs/vms/nimbos-x86_64.toml APP_FEATURES=fs run
```
