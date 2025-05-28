# Run AxVisor on QEMU riscv64

目前，在 QEMU riscv64 平台上已经对独立运行 ArceOS 和 nimbos 进行了验证。

## ArceOS

### 准备 ArceOS 镜像

1. 获取 ArceOS 主线代码 `git clone https://github.com/arceos-org/arceos.git`

2. 在 `arceos` 源码目录中执行 `make ARCH=riscv64 SMP=1 A=examples/helloworld` 获得 `examples/helloworld/helloworld_riscv64-qemu-q35.bin`

### 从文件系统加载运行

获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

1. 制作一个磁盘镜像文件，并将 ArceOS 客户机镜像放到磁盘镜像文件系统中

   1. 使用 `make disk_img` 命令生成一个空的 FAT32 磁盘镜像文件 `disk.img`

   2. 手动挂载 `disk.img`，然后将ArceOS 客户机镜像复制到该文件系统中即可

      ```bash
      $ mkdir -p tmp
      $ sudo mount disk.img tmp
      $ sudo cp helloworld_riscv64-qemu-q35.bin tmp/
      $ sudo umount tmp
      ```

2. 修改对应的 `./configs/vms/arceos-riscv64.toml` 文件中的配置项

   ```
   [kernel]
   # The entry point of the kernel image.
   entry_point = 0x8000
   # The location of image: "memory" | "fs".
   # Load from file system.
   image_location = "fs"
   # The file path of the kernel image.
   kernel_path = "/arceos/examples/helloworld/helloworld_riscv64-qemu-q35.bin"
   # The load address of the kernel image.
   kernel_load_addr = 0x20_0000
   ```

   - `image_location="fs"` 表示从文件系统加载
   - `kernel_path` 指出内核镜像在文件系统中的路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - 其他

3. 执行 `make ACCEL=n ARCH=riscv64 LOG=info VM_CONFIGS=configs/vms/arceos-riscv64.toml FEATURES=page-alloc-64g APP_FEATURES=fs run` 构建 AxVisor，并在 QEMU 中启动。

   ```bash
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = riscv64
   platform = riscv64-qemu-virt
   target = riscv64gc-unknown-none-elf
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.029278 0 axruntime:139] Logging is enabled.
   [  0.029991 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.030323 0 axruntime:142] Found physcial memory regions:
   [  0.030872 0 axruntime:144]   [PA:0x80200000, PA:0x8026d000) .text (READ | EXECUTE | RESERVED)
   [  0.031504 0 axruntime:144]   [PA:0x8026d000, PA:0x80286000) .rodata (READ | RESERVED)
   [  0.031777 0 axruntime:144]   [PA:0x80286000, PA:0x80289000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.032126 0 axruntime:144]   [PA:0x80289000, PA:0x802c9000) boot stack (READ | WRITE | RESERVED)
   [  0.032423 0 axruntime:144]   [PA:0x802c9000, PA:0x804ed000) .bss (READ | WRITE | RESERVED)
   [  0.032736 0 axruntime:144]   [PA:0x804ed000, PA:0x88000000) free memory (READ | WRITE | FREE)
   [  0.033083 0 axruntime:144]   [PA:0x101000, PA:0x102000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.033393 0 axruntime:144]   [PA:0xc000000, PA:0xc210000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.033701 0 axruntime:144]   [PA:0x10000000, PA:0x10001000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.034025 0 axruntime:144]   [PA:0x10001000, PA:0x10009000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.034327 0 axruntime:144]   [PA:0x30000000, PA:0x40000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.034629 0 axruntime:144]   [PA:0x40000000, PA:0x80000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.034985 0 axruntime:226] Initialize global memory allocator...
   [  0.035246 0 axruntime:227]   use TLSF allocator.
   [  0.036774 0 axmm:72] Initialize virtual memory management...
   [  0.060657 0 axruntime:159] Initialize platform devices...
   [  0.060998 0 axtask::api:73] Initialize scheduling...
   [  0.062593 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.063236 0:2 axdriver:172] Initialize device drivers...
   [  0.063728 0:2 axdriver:173]   device model: static
   [  0.067880 0:2 virtio_drivers::device::blk:59] config: 0xffffffc040006000
   [  0.068333 0:2 virtio_drivers::device::blk:64] found a block device of size 65536KB
   [  0.069105 0:2 axdriver::bus::pci:104] registered a new Block device at 00:01.0: "virtio-blk"
   [  0.099971 0:2 axfs:41] Initialize filesystems...
   [  0.100246 0:2 axfs:44]   use block device 0: "virtio-blk"
   [  0.110023 0:2 fatfs::dir:139] Is a directory
   [  0.117188 0:2 fatfs::dir:139] Is a directory
   [  0.126339 0:2 fatfs::dir:139] Is a directory
   [  0.135793 0:2 fatfs::dir:139] Is a directory
   [  0.139893 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.140471 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
       _         __     ___
      / \   __  _\ \   / (_)___  ___  _ __
     / _ \  \ \/ /\ \ / /| / __|/ _ \| '__|
    / ___ \  >  <  \ V / | \__ \ (_) | |
   /_/   \_\/_/\_\  \_/  |_|___/\___/|_|
   
   
   by AxVisor Team
   
   [  0.141400 0:2 axvisor:21] Starting virtualization...
   [  0.141663 0:2 axvisor:22] Hardware support: true
   [  0.142729 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.143075 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.156735 0:2 axvisor::vmm::config:33] Creating VM[1] "arceos"
   [  0.157384 0:2 axvm::vm:114] Setting up memory region: [0x80000000~0x81000000] READ | WRITE | EXECUTE | USER
   [  0.160395 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xc000000~0xc210000] -> [0xc000000~0xc210000]
   [  0.161207 0:2 axvm::vm:166] Setting up passthrough device memory region: [0x10000000~0x10001000] -> [0x10000000~0x10001000]
   [  0.161736 0:2 axvm::vm:202] VM[1] created
   [  0.162041 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.162314 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.162628 0:2 axvisor::vmm::images::fs:153] Loading VM images from filesystem
   [  0.168998 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.169565 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.169924 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.170459 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.170977 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.171295 0:2 axvm::vm:284] Booting VM[1]
   [  0.171556 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.171856 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.172443 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.172806 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   #��6���6Be#��6��65
   
                     e�q�/%5Eu��o@#0��0�\�4
   ���                                     ��7�I�c��7��D7ք4
   �3
   B�o�~4�B�#(4#*d#<�#0T#4D#8#
                              ��E#�#8$#,#0$�h��}V���c��0�h�l���ŀ��ei���0�  P5
                                                                             �E/5��@N5
   B�J4�B�E                                                                           *��ET���!E*���K!�N�E�����瀠�E
           �
   $&�$�#<6�"  �� �##��/��}��#<�Ec� ��)�2������/��}�����    �毵��/��}���
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %��E������&f�����p��Z�f
                                          �
                                           %�)�2�
                                                 �
                                                  %� 
   $&�$�#<��"  ��f ##��    �        ��)�2�
                                          �
                                           %�)�2�
                                                 �
                                                  %�@݃U���� ��op
   $&�$�#<��"  ���Z##��    �        ��)�2�
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %��Fc����.����������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %�������������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2��       %��Ś�Eca�����������E��
                                           %�)�2��
   $&�$�#< �"  ��  ##��    �        ��)�2�        %������������������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %������������������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %������������������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %������������������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$�#< �"  ��  ##��    �        ��)�2�        %������������������p��Z�f
                                          �
                                           %�)�2�
                                                 �
   $&�$��{(�p�#<�ݽ"ccݰ��   �        ����qU/ N�E���Fc�0���������������p��Z�f
   $&�$�.E�UaA��%%# �c�o0:����� �#�EA-�E1-F
   ```

### 从内存加载运行

获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

1. 修改对应的 `./configs/vms/arceos-riscv64.toml` 中的配置项

   ```
   [kernel]
   # The entry point of the kernel image.
   entry_point = 0x8000
   # The location of image: "memory" | "fs".
   # Load from file system.
   image_location = "memory"
   # The file path of the kernel image.
   kernel_path = "/arceos/examples/helloworld/helloworld_riscv64-qemu-q35.bin"
   # The load address of the kernel image.
   kernel_load_addr = 0x20_0000
   ```

   - `image_location="memory"` 配置项
   - `kernel_path` 指定内核镜像在工作空间中的相对/绝对路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - 其他

2. 执行 `make ACCEL=n ARCH=riscv64 LOG=info VM_CONFIGS=configs/vms/arceos-riscv64.toml FEATURES=page-alloc-64g run` 构建 AxVisor，并在 QEMU 中启动。

   ```bash
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = riscv64
   platform = riscv64-qemu-virt
   target = riscv64gc-unknown-none-elf
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.033033 0 axruntime:139] Logging is enabled.
   [  0.033974 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.034529 0 axruntime:142] Found physcial memory regions:
   [  0.035069 0 axruntime:144]   [PA:0x80200000, PA:0x80251000) .text (READ | EXECUTE | RESERVED)
   [  0.035833 0 axruntime:144]   [PA:0x80251000, PA:0x8026b000) .rodata (READ | RESERVED)
   [  0.036372 0 axruntime:144]   [PA:0x8026b000, PA:0x8026e000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.036997 0 axruntime:144]   [PA:0x8026e000, PA:0x802ae000) boot stack (READ | WRITE | RESERVED)
   [  0.037600 0 axruntime:144]   [PA:0x802ae000, PA:0x804d2000) .bss (READ | WRITE | RESERVED)
   [  0.038160 0 axruntime:144]   [PA:0x804d2000, PA:0x88000000) free memory (READ | WRITE | FREE)
   [  0.038748 0 axruntime:144]   [PA:0x101000, PA:0x102000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.039305 0 axruntime:144]   [PA:0xc000000, PA:0xc210000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.039852 0 axruntime:144]   [PA:0x10000000, PA:0x10001000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.040411 0 axruntime:144]   [PA:0x10001000, PA:0x10009000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.040965 0 axruntime:144]   [PA:0x30000000, PA:0x40000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.041552 0 axruntime:144]   [PA:0x40000000, PA:0x80000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.042200 0 axruntime:226] Initialize global memory allocator...
   [  0.042633 0 axruntime:227]   use TLSF allocator.
   [  0.044301 0 axmm:72] Initialize virtual memory management...
   [  0.068855 0 axruntime:159] Initialize platform devices...
   [  0.069350 0 axtask::api:73] Initialize scheduling...
   [  0.070532 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.071083 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.071811 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
          d8888            888     888  d8b
         d88888            888     888  Y8P
        d88P888            888     888
       d88P 888  888  888  Y88b   d88P  888  .d8888b    .d88b.   888d888
      d88P  888  `Y8bd8P'   Y88b d88P   888  88K       d88""88b  888P"
     d88P   888    X88K      Y88o88P    888  "Y8888b.  888  888  888
    d8888888888  .d8""8b.     Y888P     888       X88  Y88..88P  888
   d88P     888  888  888      Y8P      888   88888P'   "Y88P"   888
   
   
   by AxVisor Team
   
   [  0.074159 0:2 axvisor:21] Starting virtualization...
   [  0.074645 0:2 axvisor:22] Hardware support: true
   [  0.075869 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.076362 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.090502 0:2 axvisor::vmm::config:33] Creating VM[1] "arceos"
   [  0.091340 0:2 axvm::vm:114] Setting up memory region: [0x80000000~0x81000000] READ | WRITE | EXECUTE | USER
   [  0.094702 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xc000000~0xc210000] -> [0xc000000~0xc210000]
   [  0.095782 0:2 axvm::vm:166] Setting up passthrough device memory region: [0x10000000~0x10001000] -> [0x10000000~0x10001000]
   [  0.096655 0:2 axvm::vm:202] VM[1] created
   [  0.097141 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.097558 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.098164 0:2 axvisor::vmm::images:49] Loading VM[1] images from memory
   [  0.099431 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.100145 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.100708 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.101450 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.102281 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.102764 0:2 axvm::vm:284] Booting VM[1]
   [  0.103172 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.103630 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.104392 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.104955 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   ���2�#0�*#4�*���2�#8�*�J#<Q+�
   f
    2�#0�,�,�
             2��*�#4�,#8�,#<A-����#0�.-E#4�.6�#8�.:�#<�.#0�0����#4q0�*�#8�0; �
                                                                              �M   �IL��%�)#4�K�v#8�J#<1K�f�#4�LF#8�L0#<�L#0QO�#4�N#8QO#<F6v#<�Hp#0�J�I#0�L�q#0�H#41I#8H��G��s�uŕEc����
   �Lu}�ct�Jc�څúL��-G�.��v:v&�                                                                                                                                                       ���c�
   t3��Aae���G�0.�������Zu5�<�k��6�#<�D�
   �#0�C#8�%                            #<�2%�Q#0�4��E#4�4#8�4�#<�4ve#0�6�#4�6���%�#8�6#<�7#4�9#<8E#Fc
            ��e0c  ��%���
   Fba�yo&�E�������f#<�&�0ba�yo�,�#<�,%E#0�.���%L##� �p����JQ����E*���*�����j����#0�"%G#<��*�#0�*�#0
   ```

## NimbOS

### 准备 NimbOS 镜像

[NimbOS](https://github.com/arceos-hypervisor/nimbos) 仓库的 [release](https://github.com/arceos-hypervisor/nimbos/releases/) 页面已经编译生成了可以直接运行的 NimbOS 二进制镜像文件压缩包：

* 不带 `_usertests` 后缀的 NimbOS 二进制镜像包中编译的 NimbOS 启动后会进入 NimbOS 的 shell，本示例启动的就是这个 NimbOS
* 带 `usertests` 后缀的 NimbOS 二进制镜像压缩包中编译的 NimbOS 启动后会自动运行用户态测例用于测试，这个镜像用于 AxVisor 的CI测试，见 [setup-nimbos-guest-image/action.yml](https://github.com/arceos-hypervisor/axvisor/blob/master/.github/workflows/actions/setup-nimbos-guest-image/action.yml)

### 从文件系统加载运行

1. 制作一个磁盘镜像文件，并将客户机镜像放到文件系统中

   1. 使用 `make disk_img` 命令生成一个空的 FAT32 磁盘镜像文件 `disk.img`

   2. 手动挂载 `disk.img`，然后拉取并解压二进制镜像

      ```bash
      $ mkdir -p tmp
      $ sudo mount disk.img tmp
      $ wget https://github.com/arceos-hypervisor/nimbos/releases/download/v0.7/riscv64.zip
      $ unzip riscv64.zip # 得到 nimbos.bin
      $ sudo mv nimbos.bin tmp/nimbos.bin
      $ sudo umount tmp
      ```

2. 直接使用 [`configs/vms/nimbos-riscv64.toml`](https://github.com/arceos-hypervisor/axvisor/blob/master/configs/vms/nimbos-riscv64.toml) 文件中的配置项

   - `image_location="fs"` 表示从文件系统加载
   - `kernel_path` 指出内核镜像在文件系统中的路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - 其他

3. 执行 `make ACCEL=n ARCH=riscv64 LOG=info VM_CONFIGS=configs/vms/nimbos-riscv64.toml FEATURES=page-alloc-64g APP_FEATURES=fs defconfig` 创建 `.axconfig.toml` 配置文件

4. 执行 `make ACCEL=n ARCH=riscv64 LOG=info VM_CONFIGS=configs/vms/nimbos-riscv64.toml FEATURES=page-alloc-64g APP_FEATURES=fs run` 构建 AxVisor，并在 QEMU 中启动。

   ```bash
   qemu-system-riscv64 -m 4G -smp 1 -machine virt -bios default -kernel /code/new/axvisor/axvisor_riscv64-qemu-virt.bin -device virtio-blk-pci,drive=disk0 -drive id=disk0,if=none,format=raw,file=disk.img -nographic
   
   OpenSBI v1.3
      ____                    _____ ____ _____
     / __ \                  / ____|  _ \_   _|
    | |  | |_ __   ___ _ __ | (___ | |_) || |
    | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
    | |__| | |_) |  __/ | | |____) | |_) || |_
     \____/| .__/ \___|_| |_|_____/|___/_____|
           | |
           |_|
   
   Platform Name             : riscv-virtio,qemu
   Platform Features         : medeleg
   Platform HART Count       : 1
   Platform IPI Device       : aclint-mswi
   Platform Timer Device     : aclint-mtimer @ 10000000Hz
   Platform Console Device   : uart8250
   Platform HSM Device       : ---
   Platform PMU Device       : ---
   Platform Reboot Device    : sifive_test
   Platform Shutdown Device  : sifive_test
   Platform Suspend Device   : ---
   Platform CPPC Device      : ---
   Firmware Base             : 0x80000000
   Firmware Size             : 322 KB
   Firmware RW Offset        : 0x40000
   Firmware RW Size          : 66 KB
   Firmware Heap Offset      : 0x48000
   Firmware Heap Size        : 34 KB (total), 2 KB (reserved), 9 KB (used), 22 KB (free)
   Firmware Scratch Size     : 4096 B (total), 760 B (used), 3336 B (free)
   Runtime SBI Version       : 1.0
   
   Domain0 Name              : root
   Domain0 Boot HART         : 0
   Domain0 HARTs             : 0*
   Domain0 Region00          : 0x0000000002000000-0x000000000200ffff M: (I,R,W) S/U: ()
   Domain0 Region01          : 0x0000000080040000-0x000000008005ffff M: (R,W) S/U: ()
   Domain0 Region02          : 0x0000000080000000-0x000000008003ffff M: (R,X) S/U: ()
   Domain0 Region03          : 0x0000000000000000-0xffffffffffffffff M: (R,W,X) S/U: (R,W,X)
   Domain0 Next Address      : 0x0000000080200000
   Domain0 Next Arg1         : 0x00000000bfe00000
   Domain0 Next Mode         : S-mode
   Domain0 SysReset          : yes
   Domain0 SysSuspend        : yes
   
   Boot HART ID              : 0
   Boot HART Domain          : root
   Boot HART Priv Version    : v1.12
   Boot HART Base ISA        : rv64imafdch
   Boot HART ISA Extensions  : time,sstc
   Boot HART PMP Count       : 16
   Boot HART PMP Granularity : 4
   Boot HART PMP Address Bits: 54
   Boot HART MHPM Count      : 16
   Boot HART MIDELEG         : 0x0000000000001666
   Boot HART MEDELEG         : 0x0000000000f0b509
   
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = riscv64
   platform = riscv64-qemu-virt
   target = riscv64gc-unknown-none-elf
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.028791 0 axruntime:139] Logging is enabled.
   [  0.029501 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.029828 0 axruntime:142] Found physcial memory regions:
   [  0.030204 0 axruntime:144]   [PA:0x80200000, PA:0x8026d000) .text (READ | EXECUTE | RESERVED)
   [  0.030682 0 axruntime:144]   [PA:0x8026d000, PA:0x80286000) .rodata (READ | RESERVED)
   [  0.030992 0 axruntime:144]   [PA:0x80286000, PA:0x80289000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.031321 0 axruntime:144]   [PA:0x80289000, PA:0x802c9000) boot stack (READ | WRITE | RESERVED)
   [  0.031626 0 axruntime:144]   [PA:0x802c9000, PA:0x804ed000) .bss (READ | WRITE | RESERVED)
   [  0.031943 0 axruntime:144]   [PA:0x804ed000, PA:0x88000000) free memory (READ | WRITE | FREE)
   [  0.032269 0 axruntime:144]   [PA:0x101000, PA:0x102000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.032566 0 axruntime:144]   [PA:0xc000000, PA:0xc210000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.032859 0 axruntime:144]   [PA:0x10000000, PA:0x10001000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.033155 0 axruntime:144]   [PA:0x10001000, PA:0x10009000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.033483 0 axruntime:144]   [PA:0x30000000, PA:0x40000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.033778 0 axruntime:144]   [PA:0x40000000, PA:0x80000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.034125 0 axruntime:226] Initialize global memory allocator...
   [  0.034382 0 axruntime:227]   use TLSF allocator.
   [  0.035886 0 axmm:72] Initialize virtual memory management...
   [  0.059650 0 axruntime:159] Initialize platform devices...
   [  0.059981 0 axtask::api:73] Initialize scheduling...
   [  0.061045 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.061406 0:2 axdriver:172] Initialize device drivers...
   [  0.061668 0:2 axdriver:173]   device model: static
   [  0.065304 0:2 virtio_drivers::device::blk:59] config: 0xffffffc040006000
   [  0.065747 0:2 virtio_drivers::device::blk:64] found a block device of size 65536KB
   [  0.066567 0:2 axdriver::bus::pci:104] registered a new Block device at 00:01.0: "virtio-blk"
   [  0.096997 0:2 axfs:41] Initialize filesystems...
   [  0.097260 0:2 axfs:44]   use block device 0: "virtio-blk"
   [  0.107167 0:2 fatfs::dir:139] Is a directory
   [  0.114616 0:2 fatfs::dir:139] Is a directory
   [  0.124030 0:2 fatfs::dir:139] Is a directory
   [  0.133590 0:2 fatfs::dir:139] Is a directory
   [  0.137773 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.138349 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
       _         __     ___
      / \   __  _\ \   / (_)___  ___  _ __
     / _ \  \ \/ /\ \ / /| / __|/ _ \| '__|
    / ___ \  >  <  \ V / | \__ \ (_) | |
   /_/   \_\/_/\_\  \_/  |_|___/\___/|_|
   
   
   by AxVisor Team
   
   [  0.139243 0:2 axvisor:21] Starting virtualization...
   [  0.139504 0:2 axvisor:22] Hardware support: true
   [  0.140719 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.141091 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.154782 0:2 axvisor::vmm::config:33] Creating VM[1] "nimbos"
   [  0.155608 0:2 axvm::vm:114] Setting up memory region: [0x90000000~0x91000000] READ | WRITE | EXECUTE | USER
   [  0.158804 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xc000000~0xc210000] -> [0xc000000~0xc210000]
   [  0.159618 0:2 axvm::vm:166] Setting up passthrough device memory region: [0x10000000~0x10001000] -> [0x10000000~0x10001000]
   [  0.160212 0:2 axvm::vm:202] VM[1] created
   [  0.160527 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.160803 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.161133 0:2 axvisor::vmm::images::fs:153] Loading VM images from filesystem
   [  0.211299 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.211971 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.212344 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.212914 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.213460 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.213842 0:2 axvm::vm:284] Booting VM[1]
   [  0.214197 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.214614 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.215355 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.215844 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   
   NN   NN  iii               bb        OOOOO    SSSSS
   NNN  NN       mm mm mmmm   bb       OO   OO  SS
   NN N NN  iii  mmm  mm  mm  bbbbbb   OO   OO   SSSSS
   NN  NNN  iii  mmm  mm  mm  bb   bb  OO   OO       SS
   NN   NN  iii  mmm  mm  mm  bbbbbb    OOOO0    SSSSS
                 ___    ____    ___    ___
                |__ \  / __ \  |__ \  |__ \
                __/ / / / / /  __/ /  __/ /
               / __/ / /_/ /  / __/  / __/
              /____/ \____/  /____/ /____/
   
   arch = riscv64
   platform = qemu-virt-riscv
   build_mode = release
   log_level = warn
   
   Initializing kernel heap at: [0xffffffc0902920a8, 0xffffffc0906920a8)
   Initializing frame allocator at: [PA:0x90693000, PA:0x98000000)
   Mapping .text: [0xffffffc090200000, 0xffffffc090210000)
   Mapping .rodata: [0xffffffc090210000, 0xffffffc090217000)
   Mapping .data: [0xffffffc090217000, 0xffffffc09028e000)
   Mapping .bss: [0xffffffc090292000, 0xffffffc090693000)
   Mapping boot stack: [0xffffffc09028e000, 0xffffffc090292000)
   Mapping physical memory: [0xffffffc090693000, 0xffffffc098000000)
   Mapping MMIO: [0xffffffc00c000000, 0xffffffc00c210000)
   Mapping MMIO: [0xffffffc010000000, 0xffffffc010001000)
   Initializing drivers...
   Initializing task manager...
   /**** APPS ****
   cyclictest
   exit
   fantastic_text
   forktest
   forktest2
   forktest_simple
   forktest_simple_c
   forktree
   hello_c
   hello_world
   matrix
   poweroff
   sleep
   sleep_simple
   stack_overflow
   thread_simple
   user_shell
   usertests
   yield
   **************/
   Running tasks...
   test kernel task: pid = TaskId(2), arg = 0xdead
   test kernel task: pid = TaskId(3), arg = 0xbeef
   Rust user shell
   >> 
   ```

### 从内存中加载运行

   * 获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

     1. 修改对应的 `./configs/vms/nimbos-riscv64.toml` 中的配置项，注意设置 `kernel_path`  和 `bios_path` 为 nimbos 二进制内核镜像在工作空间中的相对/绝对路径

        ```bash
        [kernel]
        # The entry point of the kernel image.
        entry_point = 0x9020_0000
        # The location of image: "memory" | "fs".
        # Load from file system.
        image_location = "memory"
        # The file path of the kernel image.
        kernel_path = "nimbos.bin"
        # The load address of the kernel image.
        kernel_load_addr = 0x9020_0000
        ```

        - `image_location="memory"` 配置项
        - `kernel_path` 指定内核镜像在工作空间中的相对/绝对路径
        - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
        - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
        - `bios_path` 可通过 [链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin) 直接下载，或参考 riscv64 用户虚拟机的极简BIOS实现 [axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 
        - `bios_load_addr` 指出 bios 镜像的加载地址，默认为  0x8000
        - 其他

     2. 执行 `make ACCEL=n ARCH=riscv64 LOG=info VM_CONFIGS=configs/vms/nimbos-riscv64.toml FEATURES=page-alloc-64g run` 构建 AxVisor，并在 QEMU 中启动。

        ```bash
        qemu-system-riscv64 -m 4G -smp 1 -machine virt -bios default -kernel /code/new/axvisor/axvisor_riscv64-qemu-virt.bin -device virtio-blk-pci,drive=disk0 -drive id=disk0,if=none,format=raw,file=disk.img -nographic
        
        OpenSBI v1.3
           ____                    _____ ____ _____
          / __ \                  / ____|  _ \_   _|
         | |  | |_ __   ___ _ __ | (___ | |_) || |
         | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
         | |__| | |_) |  __/ | | |____) | |_) || |_
          \____/| .__/ \___|_| |_|_____/|___/_____|
                | |
                |_|
        
        Platform Name             : riscv-virtio,qemu
        Platform Features         : medeleg
        Platform HART Count       : 1
        Platform IPI Device       : aclint-mswi
        Platform Timer Device     : aclint-mtimer @ 10000000Hz
        Platform Console Device   : uart8250
        Platform HSM Device       : ---
        Platform PMU Device       : ---
        Platform Reboot Device    : sifive_test
        Platform Shutdown Device  : sifive_test
        Platform Suspend Device   : ---
        Platform CPPC Device      : ---
        Firmware Base             : 0x80000000
        Firmware Size             : 322 KB
        Firmware RW Offset        : 0x40000
        Firmware RW Size          : 66 KB
        Firmware Heap Offset      : 0x48000
        Firmware Heap Size        : 34 KB (total), 2 KB (reserved), 9 KB (used), 22 KB (free)
        Firmware Scratch Size     : 4096 B (total), 760 B (used), 3336 B (free)
        Runtime SBI Version       : 1.0
        
        Domain0 Name              : root
        Domain0 Boot HART         : 0
        Domain0 HARTs             : 0*
        Domain0 Region00          : 0x0000000002000000-0x000000000200ffff M: (I,R,W) S/U: ()
        Domain0 Region01          : 0x0000000080040000-0x000000008005ffff M: (R,W) S/U: ()
        Domain0 Region02          : 0x0000000080000000-0x000000008003ffff M: (R,X) S/U: ()
        Domain0 Region03          : 0x0000000000000000-0xffffffffffffffff M: (R,W,X) S/U: (R,W,X)
        Domain0 Next Address      : 0x0000000080200000
        Domain0 Next Arg1         : 0x00000000bfe00000
        Domain0 Next Mode         : S-mode
        Domain0 SysReset          : yes
        Domain0 SysSuspend        : yes
        
        Boot HART ID              : 0
        Boot HART Domain          : root
        Boot HART Priv Version    : v1.12
        Boot HART Base ISA        : rv64imafdch
        Boot HART ISA Extensions  : time,sstc
        Boot HART PMP Count       : 16
        Boot HART PMP Granularity : 4
        Boot HART PMP Address Bits: 54
        Boot HART MHPM Count      : 16
        Boot HART MIDELEG         : 0x0000000000001666
        Boot HART MEDELEG         : 0x0000000000f0b509
        
               d8888                            .d88888b.   .d8888b.
              d88888                           d88P" "Y88b d88P  Y88b
             d88P888                           888     888 Y88b.
            d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
           d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
          d88P   888 888     888      88888888 888     888       "888
         d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
        d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
        
        arch = riscv64
        platform = riscv64-qemu-virt
        target = riscv64gc-unknown-none-elf
        build_mode = release
        log_level = info
        smp = 1
        
        [  0.029128 0 axruntime:139] Logging is enabled.
        [  0.029882 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
        [  0.030274 0 axruntime:142] Found physcial memory regions:
        [  0.030696 0 axruntime:144]   [PA:0x80200000, PA:0x80251000) .text (READ | EXECUTE | RESERVED)
        [  0.031218 0 axruntime:144]   [PA:0x80251000, PA:0x802ef000) .rodata (READ | RESERVED)
        [  0.031503 0 axruntime:144]   [PA:0x802ef000, PA:0x802f2000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
        [  0.031857 0 axruntime:144]   [PA:0x802f2000, PA:0x80332000) boot stack (READ | WRITE | RESERVED)
        [  0.032161 0 axruntime:144]   [PA:0x80332000, PA:0x80556000) .bss (READ | WRITE | RESERVED)
        [  0.032476 0 axruntime:144]   [PA:0x80556000, PA:0x88000000) free memory (READ | WRITE | FREE)
        [  0.032835 0 axruntime:144]   [PA:0x101000, PA:0x102000) mmio (READ | WRITE | DEVICE | RESERVED)
        [  0.033141 0 axruntime:144]   [PA:0xc000000, PA:0xc210000) mmio (READ | WRITE | DEVICE | RESERVED)
        [  0.033443 0 axruntime:144]   [PA:0x10000000, PA:0x10001000) mmio (READ | WRITE | DEVICE | RESERVED)
        [  0.033788 0 axruntime:144]   [PA:0x10001000, PA:0x10009000) mmio (READ | WRITE | DEVICE | RESERVED)
        [  0.034118 0 axruntime:144]   [PA:0x30000000, PA:0x40000000) mmio (READ | WRITE | DEVICE | RESERVED)
        [  0.034440 0 axruntime:144]   [PA:0x40000000, PA:0x80000000) mmio (READ | WRITE | DEVICE | RESERVED)
        [  0.034835 0 axruntime:226] Initialize global memory allocator...
        [  0.035089 0 axruntime:227]   use TLSF allocator.
        [  0.036595 0 axmm:72] Initialize virtual memory management...
        [  0.060733 0 axruntime:159] Initialize platform devices...
        [  0.061072 0 axtask::api:73] Initialize scheduling...
        [  0.061923 0:2 axtask::api:79]   use FIFO scheduler.
        [  0.062288 0:2 axruntime:192] Initialize interrupt handlers...
        [  0.062840 0:2 axruntime:204] Primary CPU 0 init OK.
        
        
            _         __     ___
           / \   __  _\ \   / (_)___  ___  _ __
          / _ \  \ \/ /\ \ / /| / __|/ _ \| '__|
         / ___ \  >  <  \ V / | \__ \ (_) | |
        /_/   \_\/_/\_\  \_/  |_|___/\___/|_|
        
        
        by AxVisor Team
        
        [  0.063905 0:2 axvisor:21] Starting virtualization...
        [  0.064163 0:2 axvisor:22] Hardware support: true
        [  0.065268 0:4 axvisor::vmm::timer:101] Initing HV Timer...
        [  0.065612 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
        [  0.080076 0:2 axvisor::vmm::config:33] Creating VM[1] "nimbos"
        [  0.080732 0:2 axvm::vm:114] Setting up memory region: [0x90000000~0x91000000] READ | WRITE | EXECUTE | USER
        [  0.083726 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xc000000~0xc210000] -> [0xc000000~0xc210000]
        [  0.084622 0:2 axvm::vm:166] Setting up passthrough device memory region: [0x10000000~0x10001000] -> [0x10000000~0x10001000]
        [  0.085274 0:2 axvm::vm:202] VM[1] created
        [  0.085570 0:2 axvm::vm:217] VM[1] vcpus set up
        [  0.085875 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
        [  0.086337 0:2 axvisor::vmm::images:49] Loading VM[1] images from memory
        [  0.087756 0:2 axvisor::vmm:35] Setting up vcpus...
        [  0.088338 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
        [  0.088714 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
        [  0.089229 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
        [  0.089767 0:2 axvisor::vmm:43] VMM starting, booting VMs...
        [  0.090118 0:2 axvm::vm:284] Booting VM[1]
        [  0.090381 0:2 axvisor::vmm:49] VM[1] boot success
        [  0.090687 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
        [  0.091268 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
        [  0.091643 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
        
        NN   NN  iii               bb        OOOOO    SSSSS
        NNN  NN       mm mm mmmm   bb       OO   OO  SS
        NN N NN  iii  mmm  mm  mm  bbbbbb   OO   OO   SSSSS
        NN  NNN  iii  mmm  mm  mm  bb   bb  OO   OO       SS
        NN   NN  iii  mmm  mm  mm  bbbbbb    OOOO0    SSSSS
                      ___    ____    ___    ___
                     |__ \  / __ \  |__ \  |__ \
                     __/ / / / / /  __/ /  __/ /
                    / __/ / /_/ /  / __/  / __/
                   /____/ \____/  /____/ /____/
        
        arch = riscv64
        platform = qemu-virt-riscv
        build_mode = release
        log_level = warn
        
        Initializing kernel heap at: [0xffffffc0902920a8, 0xffffffc0906920a8)
        Initializing frame allocator at: [PA:0x90693000, PA:0x98000000)
        Mapping .text: [0xffffffc090200000, 0xffffffc090210000)
        Mapping .rodata: [0xffffffc090210000, 0xffffffc090217000)
        Mapping .data: [0xffffffc090217000, 0xffffffc09028e000)
        Mapping .bss: [0xffffffc090292000, 0xffffffc090693000)
        Mapping boot stack: [0xffffffc09028e000, 0xffffffc090292000)
        Mapping physical memory: [0xffffffc090693000, 0xffffffc098000000)
        Mapping MMIO: [0xffffffc00c000000, 0xffffffc00c210000)
        Mapping MMIO: [0xffffffc010000000, 0xffffffc010001000)
        Initializing drivers...
        Initializing task manager...
        /**** APPS ****
        cyclictest
        exit
        fantastic_text
        forktest
        forktest2
        forktest_simple
        forktest_simple_c
        forktree
        hello_c
        hello_world
        matrix
        poweroff
        sleep
        sleep_simple
        stack_overflow
        thread_simple
        user_shell
        usertests
        yield
        **************/
        Running tasks...
        test kernel task: pid = TaskId(2), arg = 0xdead
        test kernel task: pid = TaskId(3), arg = 0xbeef
        Rust user shell
        >> 
        ```

        

