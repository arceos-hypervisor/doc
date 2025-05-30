# Run AxVisor on QEMU x86_64

目前，在 QEMU x86_64 平台上已经对独立运行 ArceOS 和 nimbos 进行了验证。

> 前提条件：
> - CPU 虚拟化已启用
> - KVM 内核模块正常
> - 当前用户在 `kvm` 组中
> - `/dev/kvm` 权限正常

## ArceOS

### 准备 ArceOS 镜像

1. 获取 ArceOS 主线代码 `git clone https://github.com/arceos-org/arceos.git`

2. 在 `arceos` 源码目录中执行 `make ARCH=x86_64 SMP=1 A=examples/helloworld` 获得 `examples/helloworld/helloworld_x86_64-qemu-q35.bin`

### 从文件系统加载运行

获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

1. 制作一个磁盘镜像文件，并将 ArceOS 客户机镜像放到磁盘镜像文件系统中

   1. 使用 `make disk_img` 命令生成一个空的 FAT32 磁盘镜像文件 `disk.img`

   2. 手动挂载 `disk.img`，然后将ArceOS 客户机镜像复制到该文件系统中即可

      ```bash
      $ mkdir -p tmp
      $ sudo mount disk.img tmp
      $ sudo cp helloworld_x86_64-qemu-q35.bin tmp/
      $ sudo wget https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin
      $ sudo cp axvm-bios.bin tmp/  #axvm-bios.bin对应配置文件中的bios_path
      $ sudo umount tmp
      ```

2. 修改对应的 `./configs/vms/arceos-x86_64.toml` 文件中的配置项
   
   ```toml
   [kernel]
   # The entry point of the kernel image.
   entry_point = 0x20_0000
   # The location of image: "memory" | "fs".
   # Load from file system.
   image_location = "fs"
   # The file path of the BIOS image.
   bios_path = "axvm-bios.bin"
   # The load address of the BIOS image.
   bios_load_addr = 0x8000
   # The file path of the kernel image.
   kernel_path = "helloworld_x86_64-qemu-q35.bin"
   # The load address of the kernel image.
   kernel_load_addr = 0x20_0000
   ```
   
   - `image_location="fs"` 表示从文件系统加载
   - `kernel_path` 指出内核镜像在文件系统中的路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - `bios_path` 可通过 [链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin) 直接下载，或参考 x86_64 用户虚拟机的极简BIOS实现 [axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 
   - `bios_load_addr` 指出 bios 镜像的加载地址，默认为  0x8000
   - 其他
   
3. 执行 `make ACCEL=y ARCH=x86_64 LOG=info VM_CONFIGS=configs/vms/arceos-x86_64.toml FEATURES=page-alloc-64g APP_FEATURES=fs run` 构建 AxVisor，并在 QEMU 中启动。
   ```plaintext
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = x86_64
   platform = x86_64-qemu-q35
   target = x86_64-unknown-none
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.003642 0 axruntime:139] Logging is enabled.
   [  0.004011 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.004456 0 axruntime:142] Found physcial memory regions:
   [  0.004886 0 axruntime:144]   [PA:0x200000, PA:0x29c000) .text (READ | EXECUTE | RESERVED)
   [  0.005505 0 axruntime:144]   [PA:0x29c000, PA:0x2c2000) .rodata (READ | RESERVED)
   [  0.006078 0 axruntime:144]   [PA:0x2c2000, PA:0x2cf000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.006846 0 axruntime:144]   [PA:0x2cf000, PA:0x30f000) boot stack (READ | WRITE | RESERVED)
   [  0.007470 0 axruntime:144]   [PA:0x30f000, PA:0x535000) .bss (READ | WRITE | RESERVED)
   [  0.008057 0 axruntime:144]   [PA:0x1000, PA:0x9f000) low memory (READ | WRITE | RESERVED)
   [  0.008671 0 axruntime:144]   [PA:0x535000, PA:0x8000000) free memory (READ | WRITE | FREE)
   [  0.009310 0 axruntime:144]   [PA:0xb0000000, PA:0xc0000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.009987 0 axruntime:144]   [PA:0xfe000000, PA:0xfec00000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.010710 0 axruntime:144]   [PA:0x7000000000, PA:0x7000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.011422 0 axruntime:144]   [PA:0xfec00000, PA:0xfec01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.012132 0 axruntime:144]   [PA:0xfed00000, PA:0xfed01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.012814 0 axruntime:144]   [PA:0xfee00000, PA:0xfee01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013487 0 axruntime:144]   [PA:0x380000000000, PA:0x380000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.014202 0 axruntime:226] Initialize global memory allocator...
   [  0.014645 0 axruntime:227]   use TLSF allocator.
   [  0.015039 0 axmm:72] Initialize virtual memory management...
   [  0.016289 0 axruntime:159] Initialize platform devices...
   [  0.016756 0 axhal::platform::x86_pc::apic:90] Initialize Local APIC...
   [  0.017259 0 axhal::platform::x86_pc::apic:105] Using x2APIC.
   [  0.017793 0 axhal::platform::x86_pc::apic:119] Initialize IO APIC...
   [  0.018276 0 axtask::api:73] Initialize scheduling...
   [  0.018680 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.019085 0:2 axdriver:172] Initialize device drivers...
   [  0.019518 0:2 axdriver:173]   device model: static
   [  0.034235 0:2 virtio_drivers::device::blk:59] config: 0xffff807000002000
   [  0.034788 0:2 virtio_drivers::device::blk:64] found a block device of size 65536KB
   [  0.035418 0:2 axdriver::bus::pci:104] registered a new Block device at 00:03.0: "virtio-blk"
   [  0.186017 0:2 axfs:41] Initialize filesystems...
   [  0.186444 0:2 axfs:44]   use block device 0: "virtio-blk"
   [  0.195781 0:2 fatfs::dir:139] Is a directory
   [  0.207073 0:2 fatfs::dir:139] Is a directory
   [  0.219798 0:2 fatfs::dir:139] Is a directory
   [  0.234592 0:2 fatfs::dir:139] Is a directory
   [  0.238156 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.238621 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
          d8888            888     888  d8b
         d88888            888     888  Y8P
        d88P888            888     888
       d88P 888  888  888  Y88b   d88P  888  .d8888b    .d88b.   888d888
      d88P  888  `Y8bd8P'   Y88b d88P   888  88K       d88""88b  888P"
     d88P   888    X88K      Y88o88P    888  "Y8888b.  888  888  888
    d8888888888  .d8""8b.     Y888P     888       X88  Y88..88P  888
   d88P     888  888  888      Y8P      888   88888P'   "Y88P"   888
   
   
   by AxVisor Team
   
   [  0.241689 0:2 axvisor:21] Starting virtualization...
   [  0.242094 0:2 axvisor:22] Hardware support: true
   [  0.242489 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.242947 0:4 x86_vcpu::vmx::percpu:114] [AxVM] succeeded to turn on VMX.
   [  0.243469 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.244144 0:2 axvisor::vmm::config:33] Creating VM[1] "arceos"
   [  0.244627 0:2 x86_vcpu::vmx::vcpu:178] [HV] created VmxVcpu(vmcs: PA:0x7d2000)
   [  0.245181 0:2 axvm::vm:114] Setting up memory region: [0x0~0x1000000] READ | WRITE | EXECUTE
   [  0.246636 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfec00000~0xfec01000] -> [0xfec00000~0xfec01000]
   [  0.247567 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfee00000~0xfee01000] -> [0xfee00000~0xfee01000]
   [  0.248367 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfed00000~0xfed01000] -> [0xfed00000~0xfed01000]
   [  0.249164 0:2 axvm::vm:202] VM[1] created
   [  0.249583 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.249960 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.250513 0:2 axvisor::vmm::images:49] Loading VM[1] images from memory
   [  0.251069 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.251467 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.251964 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.252468 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.253119 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.253561 0:2 axvm::vm:284] Booting VM[1]
   [  0.253904 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.254292 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.254803 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.255321 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   [  0.256999 0:5 x86_vcpu::vmx::vcpu:1018] handle_cpuid: Failed to get TSC frequency by CPUID, default to 3000 MHz
   Got TSC frequency by CPUID: 3000 MHz
   
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = x86_64
   platform = x86_64-qemu-q35
   target = x86_64-unknown-none
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.004683 0 axruntime:139] Logging is enabled.
   [  0.005191 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.005791 0 axruntime:142] Found physcial memory regions:
   [  0.006373 0 axruntime:144]   [PA:0x200000, PA:0x209000) .text (READ | EXECUTE | RESERVED)
   [  0.007194 0 axruntime:144]   [PA:0x209000, PA:0x20c000) .rodata (READ | RESERVED)
   [  0.007951 0 axruntime:144]   [PA:0x20c000, PA:0x213000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.008902 0 axruntime:144]   [PA:0x213000, PA:0x253000) boot stack (READ | WRITE | RESERVED)
   [  0.009744 0 axruntime:144]   [PA:0x253000, PA:0x255000) .bss (READ | WRITE | RESERVED)
   [  0.010539 0 axruntime:144]   [PA:0x1000, PA:0x9f000) low memory (READ | WRITE | RESERVED)
   [  0.011352 0 axruntime:144]   [PA:0x255000, PA:0x8000000) free memory (READ | WRITE | FREE)
   [  0.012174 0 axruntime:144]   [PA:0xb0000000, PA:0xc0000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013060 0 axruntime:144]   [PA:0xfe000000, PA:0xfec00000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013941 0 axruntime:144]   [PA:0xfec00000, PA:0xfec01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.014821 0 axruntime:144]   [PA:0xfed00000, PA:0xfed01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.015699 0 axruntime:144]   [PA:0xfee00000, PA:0xfee01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.016586 0 axruntime:144]   [PA:0x380000000000, PA:0x380000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.017540 0 axruntime:159] Initialize platform devices...
   [  0.018125 0 axhal::platform::x86_pc::apic:90] Initialize Local APIC...
   [  0.018920 0 axhal::platform::x86_pc::apic:105] Using x2APIC.
   [  0.019645 0 axhal::platform::x86_pc::apic:119] Initialize IO APIC...
   [  0.020322 0 axruntime:204] Primary CPU 0 init OK.
   Hello, world!
   [  0.020959 0 axhal::platform::x86_pc::misc:7] Shutting down...
   [  0.274173 0:5 axvisor::vmm::vcpus:351] VM[1] run VCpu[0] SystemDown
   [  0.274663 0:5 axvm::vm:306] Shutting down VM[1]
   [  0.275045 0:5 axvisor::vmm::vcpus:366] VM[1] VCpu[0] shutting down because of VM shutdown
   [  0.275653 0:5 axvisor::vmm::vcpus:372] VM[1] VCpu[0] last VCpu exiting, decreasing running VM count
   [  0.276317 0:5 axvisor::vmm::vcpus:385] VM[1] VCpu[0] exiting...
   [  0.276788 0:2 axvisor::vmm:60] a VM exited, current running VM count: 0
   [  0.277301 0:2 axhal::platform::x86_pc::misc:7] Shutting down...
   ```

### 从内存加载运行

获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

1. 修改对应的 `./configs/vms/arceos-x86_64.toml` 中的配置项，注意设置 `kernel_path`  和 `bios_path` 为 arceos 二进制内核镜像在工作空间中的相对/绝对路径
   
   ```toml
   [kernel]
   # The entry point of the kernel image.
   entry_point = 0x20_0000
   # The location of image: "memory" | "fs".
   # Load from file system.
   image_location = "memory"
   # The file path of the BIOS image.
   bios_path = "axvm-bios.bin"
   # The load address of the BIOS image.
   bios_load_addr = 0x8000
   # The file path of the kernel image.
   kernel_path = "/arceos/examples/helloworld/helloworld_x86_64-qemu-q35.bin"
   # The load address of the kernel image.
   kernel_load_addr = 0x20_0000
   ```
   
   - `image_location="memory"` 配置项
   - `kernel_path` 指定内核镜像在工作空间中的相对/绝对路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - `bios_path` 可通过 [链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin) 直接下载，或参考 x86_64 用户虚拟机的极简BIOS实现 [axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 
   - `bios_load_addr` 指出 bios 镜像的加载地址，默认为  0x8000
   - 其他
   
2. 执行 `make ACCEL=y ARCH=x86_64 LOG=info VM_CONFIGS=configs/vms/arceos-x86_64.toml FEATURES=page-alloc-64g run` 构建 AxVisor，并在 QEMU 中启动。
   ```plaintext
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = x86_64
   platform = x86_64-qemu-q35
   target = x86_64-unknown-none
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.003637 0 axruntime:139] Logging is enabled.
   [  0.004031 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.004512 0 axruntime:142] Found physcial memory regions:
   [  0.004939 0 axruntime:144]   [PA:0x200000, PA:0x274000) .text (READ | EXECUTE | RESERVED)
   [  0.005601 0 axruntime:144]   [PA:0x274000, PA:0x293000) .rodata (READ | RESERVED)
   [  0.006194 0 axruntime:144]   [PA:0x293000, PA:0x29e000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.006942 0 axruntime:144]   [PA:0x29e000, PA:0x2de000) boot stack (READ | WRITE | RESERVED)
   [  0.007597 0 axruntime:144]   [PA:0x2de000, PA:0x504000) .bss (READ | WRITE | RESERVED)
   [  0.008186 0 axruntime:144]   [PA:0x1000, PA:0x9f000) low memory (READ | WRITE | RESERVED)
   [  0.008791 0 axruntime:144]   [PA:0x504000, PA:0x8000000) free memory (READ | WRITE | FREE)
   [  0.009406 0 axruntime:144]   [PA:0xb0000000, PA:0xc0000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.010126 0 axruntime:144]   [PA:0xfe000000, PA:0xfec00000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.010853 0 axruntime:144]   [PA:0x7000000000, PA:0x7000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.011530 0 axruntime:144]   [PA:0xfec00000, PA:0xfec01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.012192 0 axruntime:144]   [PA:0xfed00000, PA:0xfed01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.012824 0 axruntime:144]   [PA:0xfee00000, PA:0xfee01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013483 0 axruntime:144]   [PA:0x380000000000, PA:0x380000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.014188 0 axruntime:226] Initialize global memory allocator...
   [  0.014651 0 axruntime:227]   use TLSF allocator.
   [  0.015030 0 axmm:72] Initialize virtual memory management...
   [  0.016096 0 axruntime:159] Initialize platform devices...
   [  0.016508 0 axhal::platform::x86_pc::apic:90] Initialize Local APIC...
   [  0.017015 0 axhal::platform::x86_pc::apic:105] Using x2APIC.
   [  0.017472 0 axhal::platform::x86_pc::apic:119] Initialize IO APIC...
   [  0.018022 0 axtask::api:73] Initialize scheduling...
   [  0.018548 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.018938 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.019409 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
       _         __     ___
      / \   __  _\ \   / (_)___  ___  _ __
     / _ \  \ \/ /\ \ / /| / __|/ _ \| '__|
    / ___ \  >  <  \ V / | \__ \ (_) | |
   /_/   \_\/_/\_\  \_/  |_|___/\___/|_|
   
   
   by AxVisor Team
   
   [  0.021007 0:2 axvisor:21] Starting virtualization...
   [  0.021431 0:2 axvisor:22] Hardware support: true
   [  0.021979 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.022427 0:4 x86_vcpu::vmx::percpu:114] [AxVM] succeeded to turn on VMX.
   [  0.022951 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.023648 0:2 axvisor::vmm::config:33] Creating VM[1] "arceos"
   [  0.024115 0:2 x86_vcpu::vmx::vcpu:178] [HV] created VmxVcpu(vmcs: PA:0x79f000)
   [  0.024657 0:2 axvm::vm:114] Setting up memory region: [0x0~0x1000000] READ | WRITE | EXECUTE
   [  0.026157 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfec00000~0xfec01000] -> [0xfec00000~0xfec01000]
   [  0.027071 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfee00000~0xfee01000] -> [0xfee00000~0xfee01000]
   [  0.027859 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfed00000~0xfed01000] -> [0xfed00000~0xfed01000]
   [  0.028701 0:2 axvm::vm:202] VM[1] created
   [  0.029123 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.029526 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.030074 0:2 axvisor::vmm::images:49] Loading VM[1] images from memory
   [  0.030612 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.031005 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.031514 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.032018 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.032728 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.033172 0:2 axvm::vm:284] Booting VM[1]
   [  0.033514 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.033897 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.034401 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.034906 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   [  0.036693 0:5 x86_vcpu::vmx::vcpu:1018] handle_cpuid: Failed to get TSC frequency by CPUID, default to 3000 MHz
   Got TSC frequency by CPUID: 3000 MHz
   
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = x86_64
   platform = x86_64-qemu-q35
   target = x86_64-unknown-none
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.004983 0 axruntime:139] Logging is enabled.
   [  0.005525 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.006186 0 axruntime:142] Found physcial memory regions:
   [  0.006782 0 axruntime:144]   [PA:0x200000, PA:0x209000) .text (READ | EXECUTE | RESERVED)
   [  0.007625 0 axruntime:144]   [PA:0x209000, PA:0x20c000) .rodata (READ | RESERVED)
   [  0.008407 0 axruntime:144]   [PA:0x20c000, PA:0x213000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.009356 0 axruntime:144]   [PA:0x213000, PA:0x253000) boot stack (READ | WRITE | RESERVED)
   [  0.010234 0 axruntime:144]   [PA:0x253000, PA:0x255000) .bss (READ | WRITE | RESERVED)
   [  0.011091 0 axruntime:144]   [PA:0x1000, PA:0x9f000) low memory (READ | WRITE | RESERVED)
   [  0.011969 0 axruntime:144]   [PA:0x255000, PA:0x8000000) free memory (READ | WRITE | FREE)
   [  0.012856 0 axruntime:144]   [PA:0xb0000000, PA:0xc0000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013800 0 axruntime:144]   [PA:0xfe000000, PA:0xfec00000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.014710 0 axruntime:144]   [PA:0xfec00000, PA:0xfec01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.015636 0 axruntime:144]   [PA:0xfed00000, PA:0xfed01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.016595 0 axruntime:144]   [PA:0xfee00000, PA:0xfee01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.017524 0 axruntime:144]   [PA:0x380000000000, PA:0x380000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.018524 0 axruntime:159] Initialize platform devices...
   [  0.019111 0 axhal::platform::x86_pc::apic:90] Initialize Local APIC...
   [  0.019892 0 axhal::platform::x86_pc::apic:105] Using x2APIC.
   [  0.020610 0 axhal::platform::x86_pc::apic:119] Initialize IO APIC...
   [  0.021268 0 axruntime:204] Primary CPU 0 init OK.
   Hello, world!
   [  0.021989 0 axhal::platform::x86_pc::misc:7] Shutting down...
   [  0.054676 0:5 axvisor::vmm::vcpus:351] VM[1] run VCpu[0] SystemDown
   [  0.055161 0:5 axvm::vm:306] Shutting down VM[1]
   [  0.055567 0:5 axvisor::vmm::vcpus:366] VM[1] VCpu[0] shutting down because of VM shutdown
   [  0.056168 0:5 axvisor::vmm::vcpus:372] VM[1] VCpu[0] last VCpu exiting, decreasing running VM count
   [  0.056865 0:5 axvisor::vmm::vcpus:385] VM[1] VCpu[0] exiting...
   [  0.057328 0:2 axvisor::vmm:60] a VM exited, current running VM count: 0
   [  0.057904 0:2 axhal::platform::x86_pc::misc:7] Shutting down...
   ```

## NimbOS

### 准备 NimbOS 镜像

[NimbOS](https://github.com/arceos-hypervisor/nimbos) 仓库的 [release](https://github.com/arceos-hypervisor/nimbos/releases/) 页面已经编译生成了可以直接运行的 NimbOS 二进制镜像文件压缩包：

* 不带 `_usertests` 后缀的 NimbOS 二进制镜像包中编译的 NimbOS 启动后会进入 NimbOS 的 shell，本示例启动的就是这个 NimbOS
* 带 `usertests` 后缀的 NimbOS 二进制镜像压缩包中编译的 NimbOS 启动后会自动运行用户态测例用于测试，这个镜像用于 AxVisor 的CI测试，见 [setup-nimbos-guest-image/action.yml](https://github.com/arceos-hypervisor/axvisor/blob/master/.github/workflows/actions/setup-nimbos-guest-image/action.yml)

### 从文件系统加载运行

获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

1. 制作一个磁盘镜像文件，并将客户机镜像放到文件系统中

   1. 使用 `make disk_img` 命令生成一个空的 FAT32 磁盘镜像文件 `disk.img`

   2. 手动挂载 `disk.img`，然后拉取并解压二进制镜像

      ```bash
      $ mkdir -p tmp
      $ sudo mount disk.img tmp
      $ wget https://github.com/arceos-hypervisor/nimbos/releases/download/v0.7/x86_64.zip
      $ unzip x86_64.zip # 得到 nimbos.bin
      $ sudo mv nimbos.bin tmp/nimbos-x86_64.bin
      $ sudo wget https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin
      $ sudo cp axvm-bios.bin tmp/  #axvm-bios.bin对应配置文件中的bios_path
      $ sudo umount tmp
      ```

2. 直接使用 [`configs/vms/nimbos-x86_64.toml`](https://github.com/arceos-hypervisor/axvisor/blob/master/configs/vms/nimbos-x86_64.toml) 文件中的配置项
   - `image_location="fs"` 表示从文件系统加载
   - `kernel_path` 指出内核镜像在文件系统中的路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - `bios_path` 可通过 [链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin) 直接下载，或参考 x86_64 用户虚拟机的极简BIOS实现 [axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 
   - `bios_load_addr` 指出 bios 镜像的加载地址，默认为  0x8000
   - 其他
   
3. 执行 `make ACCEL=y ARCH=x86_64 LOG=info VM_CONFIGS=configs/vms/nimbos-x86_64.toml FEATURES=page-alloc-64g APP_FEATURES=fs defconfig` 创建 `.axconfig.toml` 配置文件

4. 执行 `make ACCEL=y ARCH=x86_64 LOG=info VM_CONFIGS=configs/vms/nimbos-x86_64.toml FEATURES=page-alloc-64g APP_FEATURES=fs run` 构建 AxVisor，并在 QEMU 中启动。
   ```plaintext
   Booting from ROM..
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = x86_64
   platform = x86_64-qemu-q35
   target = x86_64-unknown-none
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.003847 0 axruntime:139] Logging is enabled.
   [  0.004218 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.004739 0 axruntime:142] Found physcial memory regions:
   [  0.005196 0 axruntime:144]   [PA:0x200000, PA:0x29b000) .text (READ | EXECUTE | RESERVED)
   [  0.005806 0 axruntime:144]   [PA:0x29b000, PA:0x2ae000) .rodata (READ | RESERVED)
   [  0.006403 0 axruntime:144]   [PA:0x2ae000, PA:0x2bb000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.007159 0 axruntime:144]   [PA:0x2bb000, PA:0x2fb000) boot stack (READ | WRITE | RESERVED)
   [  0.007802 0 axruntime:144]   [PA:0x2fb000, PA:0x521000) .bss (READ | WRITE | RESERVED)
   [  0.008412 0 axruntime:144]   [PA:0x1000, PA:0x9f000) low memory (READ | WRITE | RESERVED)
   [  0.009046 0 axruntime:144]   [PA:0x521000, PA:0x8000000) free memory (READ | WRITE | FREE)
   [  0.009731 0 axruntime:144]   [PA:0xb0000000, PA:0xc0000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.010408 0 axruntime:144]   [PA:0xfe000000, PA:0xfec00000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.011119 0 axruntime:144]   [PA:0x7000000000, PA:0x7000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.011829 0 axruntime:144]   [PA:0xfec00000, PA:0xfec01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.012520 0 axruntime:144]   [PA:0xfed00000, PA:0xfed01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013224 0 axruntime:144]   [PA:0xfee00000, PA:0xfee01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013889 0 axruntime:144]   [PA:0x380000000000, PA:0x380000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.014607 0 axruntime:226] Initialize global memory allocator...
   [  0.015078 0 axruntime:227]   use TLSF allocator.
   [  0.015481 0 axmm:72] Initialize virtual memory management...
   [  0.016639 0 axruntime:159] Initialize platform devices...
   [  0.017086 0 axhal::platform::x86_pc::apic:90] Initialize Local APIC...
   [  0.017588 0 axhal::platform::x86_pc::apic:105] Using x2APIC.
   [  0.018115 0 axhal::platform::x86_pc::apic:119] Initialize IO APIC...
   [  0.018618 0 axtask::api:73] Initialize scheduling...
   [  0.019147 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.019543 0:2 axdriver:172] Initialize device drivers...
   [  0.020020 0:2 axdriver:173]   device model: static
   [  0.034723 0:2 virtio_drivers::device::blk:59] config: 0xffff807000002000
   [  0.035288 0:2 virtio_drivers::device::blk:64] found a block device of size 65536KB
   [  0.035926 0:2 axdriver::bus::pci:104] registered a new Block device at 00:03.0: "virtio-blk"
   [  0.187053 0:2 axfs:41] Initialize filesystems...
   [  0.187436 0:2 axfs:44]   use block device 0: "virtio-blk"
   [  0.190725 0:2 fatfs::dir:139] Is a directory
   [  0.196242 0:2 fatfs::dir:139] Is a directory
   [  0.202807 0:2 fatfs::dir:139] Is a directory
   [  0.210491 0:2 fatfs::dir:139] Is a directory
   [  0.213946 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.214421 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
          d8888            888     888  d8b
         d88888            888     888  Y8P
        d88P888            888     888
       d88P 888  888  888  Y88b   d88P  888  .d8888b    .d88b.   888d888
      d88P  888  `Y8bd8P'   Y88b d88P   888  88K       d88""88b  888P"
     d88P   888    X88K      Y88o88P    888  "Y8888b.  888  888  888
    d8888888888  .d8""8b.     Y888P     888       X88  Y88..88P  888
   d88P     888  888  888      Y8P      888   88888P'   "Y88P"   888
   
   
   by AxVisor Team
   
   [  0.217631 0:2 axvisor:21] Starting virtualization...
   [  0.218054 0:2 axvisor:22] Hardware support: true
   [  0.218459 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.218940 0:4 x86_vcpu::vmx::percpu:114] [AxVM] succeeded to turn on VMX.
   [  0.219489 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.220176 0:2 axvisor::vmm::config:33] Creating VM[1] "nimbos"
   [  0.220647 0:2 x86_vcpu::vmx::vcpu:178] [HV] created VmxVcpu(vmcs: PA:0x7be000)
   [  0.221246 0:2 axvm::vm:114] Setting up memory region: [0x0~0x1000000] READ | WRITE | EXECUTE
   [  0.222681 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfec00000~0xfec01000] -> [0xfec00000~0xfec01000]
   [  0.223622 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfee00000~0xfee01000] -> [0xfee00000~0xfee01000]
   [  0.224476 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfed00000~0xfed01000] -> [0xfed00000~0xfed01000]
   [  0.225324 0:2 axvm::vm:202] VM[1] created
   [  0.225751 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.226150 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.226731 0:2 axvisor::vmm::images::fs:153] Loading VM images from filesystem
   [  0.287981 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.288387 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.288883 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.289398 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.290058 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.290514 0:2 axvm::vm:284] Booting VM[1]
   [  0.290863 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.291258 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.291779 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.292309 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   
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
   
   arch = x86_64
   platform = pc
   build_mode = release
   log_level = warn
   
   Initializing kernel heap at: [0xffffff8000290d00, 0xffffff8000690d00)
   Initializing IDT...
   Loading GDT for CPU 0...
   Initializing frame allocator at: [PA:0x691000, PA:0x8000000)
   Mapping .text: [0xffffff8000200000, 0xffffff800021a000)
   Mapping .rodata: [0xffffff800021a000, 0xffffff8000220000)
   Mapping .data: [0xffffff8000220000, 0xffffff800028c000)
   Mapping .bss: [0xffffff8000290000, 0xffffff8000691000)
   Mapping boot stack: [0xffffff800028c000, 0xffffff8000290000)
   Mapping physical memory: [0xffffff8000691000, 0xffffff8008000000)
   Mapping MMIO: [0xffffff80fec00000, 0xffffff80fec01000)
   Mapping MMIO: [0xffffff80fed00000, 0xffffff80fed01000)
   Mapping MMIO: [0xffffff80fee00000, 0xffffff80fee01000)
   Initializing drivers...
   Initializing Local APIC...
   Initializing HPET...
   HPET: 100.000000 MHz, 64-bit, 3 timers
   [  0.303522 0:5 x86_vcpu::vmx::vcpu:1018] handle_cpuid: Failed to get TSC frequency by CPUID, default to 3000 MHz
   Got TSC frequency by CPUID: 3000 MHz
   Calibrated LAPIC frequency: 1000.301 MHz
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

### 从内存加载运行

获取 AxVisor 主线代码 `git clone git@github.com:arceos-hypervisor/axvisor.git`，然后在 `axvisor` 源码目录中执行如下步骤：

1. 修改对应的 `./configs/vms/nimbos-x86_64.toml` 中的配置项，注意设置 `kernel_path`  和 `bios_path` 为 nimbos 二进制内核镜像在工作空间中的相对/绝对路径

   ```toml
   [kernel]
   # The entry point of the kernel image.
   entry_point = 0x8000
   # The location of image: "memory" | "fs".
   # Load from file system.
   image_location = "memory"
   # The file path of the kernel image.
   kernel_path = "nimbos.bin"
   # The load address of the kernel image.
   kernel_load_addr = 0x20_0000
   # The file path of the BIOS image.
   bios_path = "axvm-bios.bin"
   # The load address of the BIOS image.
   bios_load_addr = 0x8000
   ```

   - `image_location="memory"` 配置项
   - `kernel_path` 指定内核镜像在工作空间中的相对/绝对路径
   - `entry_point` 指出内核镜像的入口地址。必须与上面构建的 ArceOS 内核镜像的入口地址一致
   - `kernel_load_addr` 指出内核镜像的加载地址。默认与 `entry_point` 一致
   - `bios_path` 可通过 [链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin) 直接下载，或参考 x86_64 用户虚拟机的极简BIOS实现 [axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 
   - `bios_load_addr` 指出 bios 镜像的加载地址，默认为  0x8000
   - 其他

2. 执行 `make ACCEL=y ARCH=x86_64 LOG=info VM_CONFIGS=configs/vms/nimbos-x86_64.toml FEATURES=page-alloc-64g run` 构建 AxVisor，并在 QEMU 中启动。

   ```plaintext
   Booting from ROM..
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = x86_64
   platform = x86_64-qemu-q35
   target = x86_64-unknown-none
   build_mode = release
   log_level = info
   smp = 1
   
   [  0.003516 0 axruntime:139] Logging is enabled.
   [  0.003900 0 axruntime:140] Primary CPU 0 started, dtb = 0x0.
   [  0.004358 0 axruntime:142] Found physcial memory regions:
   [  0.004801 0 axruntime:144]   [PA:0x200000, PA:0x274000) .text (READ | EXECUTE | RESERVED)
   [  0.005451 0 axruntime:144]   [PA:0x274000, PA:0x30d000) .rodata (READ | RESERVED)
   [  0.006025 0 axruntime:144]   [PA:0x30d000, PA:0x318000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  0.006751 0 axruntime:144]   [PA:0x318000, PA:0x358000) boot stack (READ | WRITE | RESERVED)
   [  0.007382 0 axruntime:144]   [PA:0x358000, PA:0x57e000) .bss (READ | WRITE | RESERVED)
   [  0.007981 0 axruntime:144]   [PA:0x1000, PA:0x9f000) low memory (READ | WRITE | RESERVED)
   [  0.008598 0 axruntime:144]   [PA:0x57e000, PA:0x8000000) free memory (READ | WRITE | FREE)
   [  0.009224 0 axruntime:144]   [PA:0xb0000000, PA:0xc0000000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.009897 0 axruntime:144]   [PA:0xfe000000, PA:0xfec00000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.010572 0 axruntime:144]   [PA:0x7000000000, PA:0x7000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.011284 0 axruntime:144]   [PA:0xfec00000, PA:0xfec01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.011956 0 axruntime:144]   [PA:0xfed00000, PA:0xfed01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.012623 0 axruntime:144]   [PA:0xfee00000, PA:0xfee01000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013266 0 axruntime:144]   [PA:0x380000000000, PA:0x380000004000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  0.013953 0 axruntime:226] Initialize global memory allocator...
   [  0.014409 0 axruntime:227]   use TLSF allocator.
   [  0.014794 0 axmm:72] Initialize virtual memory management...
   [  0.015976 0 axruntime:159] Initialize platform devices...
   [  0.016407 0 axhal::platform::x86_pc::apic:90] Initialize Local APIC...
   [  0.016899 0 axhal::platform::x86_pc::apic:105] Using x2APIC.
   [  0.017370 0 axhal::platform::x86_pc::apic:119] Initialize IO APIC...
   [  0.017875 0 axtask::api:73] Initialize scheduling...
   [  0.018287 0:2 axtask::api:79]   use FIFO scheduler.
   [  0.018689 0:2 axruntime:192] Initialize interrupt handlers...
   [  0.019150 0:2 axruntime:204] Primary CPU 0 init OK.
   
   
          d8888            888     888  d8b
         d88888            888     888  Y8P
        d88P888            888     888
       d88P 888  888  888  Y88b   d88P  888  .d8888b    .d88b.   888d888
      d88P  888  `Y8bd8P'   Y88b d88P   888  88K       d88""88b  888P"
     d88P   888    X88K      Y88o88P    888  "Y8888b.  888  888  888
    d8888888888  .d8""8b.     Y888P     888       X88  Y88..88P  888
   d88P     888  888  888      Y8P      888   88888P'   "Y88P"   888
   
   
   by AxVisor Team
   
   [  0.022259 0:2 axvisor:21] Starting virtualization...
   [  0.022666 0:2 axvisor:22] Hardware support: true
   [  0.023153 0:4 axvisor::vmm::timer:101] Initing HV Timer...
   [  0.023610 0:4 x86_vcpu::vmx::percpu:114] [AxVM] succeeded to turn on VMX.
   [  0.024146 0:4 axvisor::hal:122] Hardware virtualization support enabled on core 0
   [  0.024840 0:2 axvisor::vmm::config:33] Creating VM[1] "nimbos"
   [  0.025320 0:2 x86_vcpu::vmx::vcpu:178] [HV] created VmxVcpu(vmcs: PA:0x819000)
   [  0.025877 0:2 axvm::vm:114] Setting up memory region: [0x0~0x1000000] READ | WRITE | EXECUTE
   [  0.027255 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfec00000~0xfec01000] -> [0xfec00000~0xfec01000]
   [  0.028186 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfee00000~0xfee01000] -> [0xfee00000~0xfee01000]
   [  0.028998 0:2 axvm::vm:166] Setting up passthrough device memory region: [0xfed00000~0xfed01000] -> [0xfed00000~0xfed01000]
   [  0.029809 0:2 axvm::vm:202] VM[1] created
   [  0.030227 0:2 axvm::vm:217] VM[1] vcpus set up
   [  0.030602 0:2 axvisor::vmm::config:40] VM[1] created success, loading images...
   [  0.031164 0:2 axvisor::vmm::images:49] Loading VM[1] images from memory
   [  0.031910 0:2 axvisor::vmm:35] Setting up vcpus...
   [  0.032325 0:2 axvisor::vmm::vcpus:219] Initializing VM[1]'s 1 vcpus
   [  0.032814 0:2 axvisor::vmm::vcpus:250] Spawning task for VM[1] VCpu[0]
   [  0.033326 0:2 axvisor::vmm::vcpus:262] VCpu task Task(5, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  0.033983 0:2 axvisor::vmm:43] VMM starting, booting VMs...
   [  0.034429 0:2 axvm::vm:284] Booting VM[1]
   [  0.034775 0:2 axvisor::vmm:49] VM[1] boot success
   [  0.035167 0:2 axvisor::vmm:60] a VM exited, current running VM count: 1
   [  0.035681 0:5 axvisor::vmm::vcpus:283] VM[1] VCpu[0] waiting for running
   [  0.036199 0:5 axvisor::vmm::vcpus:286] VM[1] VCpu[0] running...
   
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
   
   arch = x86_64
   platform = pc
   build_mode = release
   log_level = warn
   
   Initializing kernel heap at: [0xffffff8000290d00, 0xffffff8000690d00)
   Initializing IDT...
   Loading GDT for CPU 0...
   Initializing frame allocator at: [PA:0x691000, PA:0x8000000)
   Mapping .text: [0xffffff8000200000, 0xffffff800021a000)
   Mapping .rodata: [0xffffff800021a000, 0xffffff8000220000)
   Mapping .data: [0xffffff8000220000, 0xffffff800028c000)
   Mapping .bss: [0xffffff8000290000, 0xffffff8000691000)
   Mapping boot stack: [0xffffff800028c000, 0xffffff8000290000)
   Mapping physical memory: [0xffffff8000691000, 0xffffff8008000000)
   Mapping MMIO: [0xffffff80fec00000, 0xffffff80fec01000)
   Mapping MMIO: [0xffffff80fed00000, 0xffffff80fed01000)
   Mapping MMIO: [0xffffff80fee00000, 0xffffff80fee01000)
   Initializing drivers...
   Initializing Local APIC...
   Initializing HPET...
   HPET: 100.000000 MHz, 64-bit, 3 timers
   [  0.047412 0:5 x86_vcpu::vmx::vcpu:1018] handle_cpuid: Failed to get TSC frequency by CPUID, default to 3000 MHz
   Got TSC frequency by CPUID: 3000 MHz
   Calibrated LAPIC frequency: 1000.259 MHz
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

## 注意事项

1. 目前 qemu-system-x86_64 平台提供的 virt CPU 实现不支持 VMX feature，需要在启动时开启 `-enable-kvm` 参数（Makefile 定义的环境变量为 `ACCEL=y`）

2. [axvm-bios](https://github.com/arceos-hypervisor/axvm-bios-x86) 是针对 x86_64 用户虚拟机的一个极简BIOS实现。

   它可以承担引导 NimbOS 以及 ArceOS 启动的任务，二进制文件[链接](https://github.com/arceos-hypervisor/axvm-bios-x86/releases/download/v0.1/axvm-bios.bin).