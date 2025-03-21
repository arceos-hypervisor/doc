# Linux 镜像启动

1. 编译 linux 镜像，获取 `Image` 镜像文件。

2. 构建文件系统

    ```bash
    cd arceos-vmm
    # ARCH=(x86_64|aarch64|riscv64)
    make ubuntu_img ARCH=aarch64
    ```
3. 准备虚拟机配置文件

    ```bash
    cp configs/vms/linux-qemu-aarch64.toml tmp/
    # 编译设备树
    dtc -I dts -O dtb -o tmp/linux-qemu.dtb configs/vms/linux-qemu.dts
    ```

    修改 `tmp/linux-qemu-aarch64.toml` 文件，将 `kernel_path` 和 `dtb_path` 修改相应的绝对路径。

4. 运行

    ```bash
    make ARCH=aarch64 VM_CONFIGS=tmp/arceos-aarch64.toml LOG=debug BUS=mmio NET=y FEATURES=page-alloc-64g MEM=8g run
    ```