# ROC-RK3568-PC

对于在 ROC-RK3568-PC 开发板上运行，我们需要将相关镜像直接部署到开发板上，关于如何在 ROC-RK3568-PC 开发板上进行部署，详见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述。我们同时验证了单核和多核启动，以下示例以单核为例。注意，axvisor自身使用的配置信息为板载的dtb文件，故如果需要修改axvisor使用的配置，需要提前修改板载的dtb文件。

## ArceOS

### 准备 ArceOS 镜像

1. 获取 ArceOS 源码 `git clone git@github.com:arceos-hypervisor/arceos.git`。由于目前 ArceOS 还没有合并支持设备树的分支，因此我们需要执行 `git checkout 45-动态plat-make-脚本接口适配` 切换分支

2. 执行 `make A=examples/helloworld ARCH=aarch64 SMP=1 LOG=info FEATURES=plat-dyn,irq` 构建出 ArceOS 镜像 `examples/helloworld/helloworld_aarch64-qemu-virt.bin`

### 准备 ArceOS 设备树

在 AxVisor 源码目录中执行 `dtc -I dts -O dtb -o configs/vms/arceos-aarch64-rk3568_smp1.dtb configs/vms/arceos-aarch64-rk3568_smp1.dts` 获取 ArceOS 需要的设备树文件。

### 从文件系统加载运行

1. 修改 `configs/vms/arceos-aarch64-rk3568_smp1.toml` 配置文件。对于从文件系统加载 ArceOS 镜像，需要将 `kernel_path` 和 `dtb_path` 设置为 ArceOS 镜像和设备树在 rootfs 中的路径，并且修改 `image_location = "fs"` 指定从文件系统加载。

2. 将 ArceOS 镜像以及设备树放到 rootfs 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

3. 准备 AxVisor 镜像文件。在 AxVisor 源码目录中执行 `make ACCEL=n ARCH=aarch64 PLATFORM=aarch64-dyn LOG=debug VM_CONFIGS=configs/vms/arceos-aarch64-rk3568_smp1.toml SMP=4 APP_FEATURES=fs FEATURES=ext4fs,bus-mmio,driver-rk3568-emmc` 构建 AxVisor 镜像 `axvisor_aarch64-qemu-virt-hv.bin`

4. 将 `axvisor_aarch64-qemu-virt-hv.bin` 放到 boot.img 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

5. 将修改后的 `boot.img` 和 `rootfs.img` 部署到 ROC-RK3568-PC 开发板即可。

### 从内存加载运行

1. 修改 `configs/vms/arceos-aarch64-rk3568_smp1.toml` 配置文件。对于从内存系统加载 ArceOS 镜像，需要将 `kernel_path` 和 `dtb_path` 设置为 ArceOS 镜像和设备树的绝对路径，并且修改 `image_location = "memory"` 指定从内存加载。

2. 准备 AxVisor 镜像文件。在 AxVisor 源码目录中执行 `make ACCEL=n ARCH=aarch64 LOG=info VM_CONFIGS=configs/vms/arceos-aarch64-rk3568_smp1.toml SMP=4 PLATFORM=aarch64-dyn` 构建 AxVisor 镜像 `axvisor_aarch64-qemu-virt-hv.bin`

3. 将 `axvisor_aarch64-qemu-virt-hv.bin` 放到 boot.img 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

4. 将修改后的 `boot.img` 和 `rootfs.img` 部署到 ROC-RK3568-PC 开发板即可。

## Linux

### 准备 Linux 镜像

直接用 ROC-RK3568-PC 的 SDK 按照 `firefly_rk3568_roc-rk3568-pc_ubuntu_defconfig` 这个配置文件构建出所有的镜像文件，内核镜像直接使用生成的 `kernel/arch/arm64/boot/Image`

> 单核与多核共用同一个内核镜像即可，因为 Linux 内核启动时，会根据设备树中的配置来决定启动多少个 CPU

### 准备 Linux 设备树

在 AxVisor 源码目录中执行 `dtc -I dts -O dtb -o configs/vms/linux-aarch64-rk3568_smp1.dtb configs/vms/linux-aarch64-rk3568_smp1.dts` 获取 Linux 需要的设备树文件。

### 从文件系统加载运行

1. 修改 `configs/vms/linux-aarch64-rk3568_smp1.toml` 配置文件。对于从文件系统加载 Linux 镜像，需要将 `kernel_path` 和 `dtb_path` 设置为 Linux 镜像和设备树在 rootfs 中的路径，并且修改 `image_location = "fs"` 指定从文件系统加载。

2. 将 Linux 镜像以及设备树放到 rootfs 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

3. 准备 AxVisor 镜像文件。在 AxVisor 源码目录中执行 `make ACCEL=n ARCH=aarch64 PLATFORM=aarch64-dyn LOG=debug VM_CONFIGS=configs/vms/linux-aarch64-rk3568_smp1.toml SMP=4 APP_FEATURES=fs FEATURES=ext4fs,bus-mmio,driver-rk3568-emmc` 构建 AxVisor 镜像 `axvisor_aarch64-qemu-virt-hv.bin`

4. 将 `axvisor_aarch64-qemu-virt-hv.bin` 放到 boot.img 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

5. 将修改后的 `boot.img` 和 `rootfs.img` 部署到 ROC-RK3568-PC 开发板即可。

### 从内存加载运行

1. 修改 `configs/vms/linux-aarch64-rk3568_smp1.toml` 配置文件。对于从内存系统加载 Linux 镜像，需要将 `kernel_path` 和 `dtb_path` 设置为 Linux 镜像和设备树的绝对路径，并且修改 `image_location = "memory"` 指定从内存加载。

2. 准备 AxVisor 镜像文件。在 AxVisor 源码目录中执行 `make ACCEL=n ARCH=aarch64 PLATFORM=aarch64-dyn LOG=info VM_CONFIGS=configs/vms/linux-aarch64-rk3568_smp1.toml SMP=4 ` 构建 AxVisor 镜像 `axvisor_aarch64-qemu-virt-hv.bin`

3. 将 `axvisor_aarch64-qemu-virt-hv.bin` 放到 boot.img 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

4. 将修改后的 `boot.img` 和 `rootfs.img` 部署到 ROC-RK3568-PC 开发板即可。


## Linux + ArceOS

对于同时运行 Linux 和 ArceOS，由于开发板上默认只提供一个 UART2 作为控制台，因此，我们需要根据自己的需要更换 Linux 或 ArceOS 的控制台。主要有以下几种方案：

1. 在 U-Boot 中开启多路串口，然后 Linux 和 ArceOS 分别使用不同的串口

2. 直接让 Linux 使用默认的 UART2，而 ArceOS 使用 UART3。由于 ArceOS 没有串口初始化功能，因此会阻塞在串口打印。直到 Linux 启动后，它默认会初始化串口3，但是默认是关闭的，需要在 Linux 客户机中 cat /dev/ttyS3 启动串口后，ArceOS 才能继续打印

3. 让 Linux 使用 HDMI 的显示器作为控制台（需要修改内核配置，然后重新编译 Linux 镜像），而 ArceOS 继续使用 UART2 作为控制台。

我们在验证时，采用了方案 2，具体步骤如下：

1. 修改 `configs/vms/arceos-aarch64-rk3568_smp1.toml` 配置文件。分配 UART3 给 ArceOS 使用，然后同步修改 `configs/vms/arceos-aarch64-rk3568_smp1.dts` 文件，将原来的 UART2 相关内容换成 UART3。

### 准备镜像文件

根据以上两个章节，分别准备 ArceOS 和 Linux 的镜像文件。

### 从文件系统加载运行

1. 根据以上两个章节的介绍，分别修改好 `configs/vms/arceos-aarch64-rk3568_smp1.toml` 和 `configs/vms/linux-aarch64-rk3568_smp1.toml` 配置文件。

2. 将 ArceOS 镜像和设备树以及 Linux 镜像和设备树放到 rootfs 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

3. 准备 AxVisor 镜像文件。在 AxVisor 源码目录中执行 `make ACCEL=n ARCH=aarch64 PLATFORM=aarch64-dyn LOG=info VM_CONFIGS=configs/vms/arceos-aarch64-rk3568_smp1.toml:configs/vms/linux-aarch64-rk3568_smp1.toml SMP=4 APP_FEATURES=fs FEATURES=ext4fs,bus-mmio,driver-rk3568-emmc` 构建 AxVisor 镜像 `axvisor_aarch64-qemu-virt-hv.bin`

4. 将 `axvisor_aarch64-qemu-virt-hv.bin` 放到 boot.img 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

5. 将修改后的 `boot.img` 和 `rootfs.img` 部署到 ROC-RK3568-PC 开发板即可。

### 从内存加载运行

1. 根据以上两个章节的介绍，分别修改好 `configs/vms/arceos-aarch64-rk3568_smp1.toml` 和 `configs/vms/linux-aarch64-rk3568_smp1.toml` 配置文件。

2. 准备 AxVisor 镜像文件。在 AxVisor 源码目录中执行 `make ACCEL=n ARCH=aarch64 PLATFORM=aarch64-dyn LOG=info VM_CONFIGS=configs/vms/arceos-aarch64-rk3568_smp1.toml:configs/vms/linux-aarch64-rk3568_smp1.toml SMP=4 APP_FEATURES=fs FEATURES=ext4fs,bus-mmio,driver-rk3568-emmc` 构建 AxVisor 镜像 `axvisor_aarch64-qemu-virt-hv.bin`

3. 将 `axvisor_aarch64-qemu-virt-hv.bin` 放到 boot.img 中，具体步骤参见 https://github.com/arceos-hypervisor/axvisor/issues/70 中的描述！

4. 将修改后的 `boot.img` 和 `rootfs.img` 部署到 ROC-RK3568-PC 开发板即可。

## 问题参考

更详细的描述，参见移植及适配过程详对应的 ISSUE 中的记录：

1. https://github.com/arceos-hypervisor/axvisor/issues/66

2. https://github.com/arceos-hypervisor/axvisor/issues/67

3. https://github.com/arceos-hypervisor/axvisor/issues/68
