# ArceOS Linux 2虚拟机启动

1. 编译 linux 镜像，获取 `Image` 镜像文件。

2. 编译 `ArceOS` 的 `Helloworld` 用例，得到二进制文件。

3. 准备虚拟机配置文件

    ```bash
    # 准备文件系统
    make ubuntu_img ARCH=aarch64
    cp configs/vms/arceos-aarch64.toml tmp/
    cp configs/vms/linux-qemu-aarch64-vm2.toml tmp/

    # 编译设备树
    dtc -I dts -O dtb -o tmp/linux-qemu.dtb configs/vms/linux-qemu.dts
    ```

    修改 `tmp/linux-qemu-aarch64-vm2.toml`、`tmp/arceos-aarch64.toml` 文件，将 `kernel_path` 和 `dtb_path` 修改相应的绝对路径，`image_location` 改为 `memory`。

    注意：旧版 `ArceOS` 入口地址为 `0x4008_0000`，新版为 `0x4020_0000`，需修改相应配置项。

4. 运行

- 打开第一个终端，运行

  ```
  make ARCH=aarch64 VM_CONFIGS=tmp/arceos-aarch64.toml:tmp/linux-qemu-aarch64-vm2.toml LOG=info BUS=mmio NET=y FEATURES=page-alloc-64g MEM=8g SECOND_SERIAL=y SMP=2 run

  # 之后修改.axconfig.toml，将smp=1 改为smp=2，再重新运行
  ```

- 打开第二个终端，输入

  ```
  telnet localhost 4321
  ```


【注意】

若启动axvisor后只有一个vm有输出，另一个无显示，可能是qemu配置选项不全，需查看当前qemu版本，建议使用9.2.2版本，安装过程如下

```plain
# 安装编译所需的依赖包
sudo apt install autoconf automake autotools-dev curl libmpc-dev libmpfr-dev libgmp-dev \
              gawk build-essential bison flex texinfo gperf libtool patchutils bc \
              zlib1g-dev libexpat-dev pkg-config  libglib2.0-dev libpixman-1-dev libsdl2-dev \
              git tmux python3 python3-pip ninja-build
# 下载源码
wget https://download.qemu.org/qemu-9.2.2.tar.xz
# 解压
tar xvJf qemu-9.2.2.tar.xz
cd qemu-9.2.2
#生成设置文件
./configure --enable-kvm --enable-slirp --enable-debug --target-list=aarch64-softmmu,x86_64-softmmu
#编译
make -j$(nproc)
```

之后编辑 `~/.bashrc` 文件，在文件的末尾加入几行：

```plain
export PATH=/path/to/qemu-9.2.2/build:$PATH
```

更新当前shell

 `source ~/.bashrc`