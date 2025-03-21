# 黑芝麻a1000同时启动linux和一个arceos适配

1. 镜像准备

   1. 编译一个适合黑芝麻a1000平台的linux镜像，以及对应的dtb文件
   2. 编译一个只使用串口设备的arceos hello_world
      - 在qemu使用的配置信息上进行修改即可
      - 将串口更改为使用uart8250，将相应的串口地址进行改动
      - 将起始地址和内存信息配置为guest arceos toml中使用的对应内存
      - 配合guest arceos toml中使用的内存，在`mem.rs`文件中增加对应的一级页表信息，使arceos能够使用相应的内存

2. 修改目前的`build.rs` 、`image.rs` 、`config.rs`文件，使其支持两个os从内存中加载（目前实现方式比较暴力）

3. 配置`arceos-umhv/arceos-vmm/configs/platforms/aarch64-bsta1000b-virt-hv.toml`文件

   ```toml
   # Architecture identifier.
   arch = "aarch64"                    # str    //host 架构
   # Platform identifier.
   platform = "aarch64-bsta1000b-hv"   # str    //host 平台
   
   #
   # Platform configs
   #
   [plat]
   # Platform family.
   family = "aarch64-bsta1000b"        # str
   
   # Base address of the whole physical memory.
   phys-memory-base = 0x1_9800_0000   //host物理内存起始地址
   # Size of the whole physical memory.
   phys-memory-size = 0x1800_0000    //host自身占用的物理内存大小
   # Base physical address of the kernel image.
   kernel-base-paddr = 0x1_a000_0000  //host内核起始物理地址
   # Base virtual address of the kernel image.
   kernel-base-vaddr = "0x0000_0001_a000_0000"   //host内核起始虚拟地址
   # Linear mapping offset, for quick conversions between physical and virtual
   # addresses.
   phys-virt-offset = "0x0000_0000_0000_0000"
   # Offset of bus address and phys address. some boards, the bus address is
   # different from the physical address.
   phys-bus-offset = 0
   # Kernel address space base.
   kernel-aspace-base = "0x0000_0000_0000_0000"
   # Kernel address space size.
   kernel-aspace-size = "0x0000_ffff_ffff_f000"
   
   #
   # Device specifications
   #
   [devices]
   # MMIO regions with format (`base_paddr`, `size`).
   //host 使用的物理设备
   mmio-regions = [
       [0x20008000, 0x1000], # uart8250 UART0
       [0x32000000, 0x8000], # arm,gic-400
       [0x32011000, 0x1000], # CPU CSR
       [0x33002000, 0x1000], # Top CRM
       [0x70035000, 0x1000], # CRM reg
       [0x70038000, 0x1000], # aon pinmux
   ] # [(uint, uint)]
   # VirtIO MMIO regions with format (`base_paddr`, `size`).
   virtio-mmio-regions = []    # [(uint, uint)]
   
   # Base physical address of the PCIe ECAM space.
   pci-ecam-base = 0x30E0_2000
   
   # UART Address
   uart-paddr = 0x2000_8000        # uint
   # UART IRQ number
   uart-irq = 0xd5                 # uint
   
   # GIC CPU Interface base address
   gicc-paddr = 0x3200_2000        # uint
   # GIC Distributor base address
   gicd-paddr = 0x3200_1000        # uint
   
   # BST A1000B board registers
   cpu-csr-base = 0x3201_1000          # uint
   a1000base-topcrm = 0x3300_2000      # uint
   a1000base-safetycrm = 0x7003_5000   # uint
   a1000base-aoncfg = 0x7003_8000      # uint
   
   # PSCI
   psci-method = "smc"     # str
   
   # RTC (PL031) Address (Need to read from DTB).
   rtc-paddr = 0x0         # uint
   
   ```

4. 配置两个guest的相关信息

   1. 配置`arceos-umhv/arceos-vmm/configs/vms/linux-a1000-aarch64-smp1.toml`文件，配置guest linux的初始信息

      ```toml
      id = 0                 //guest vm id
      name = "linux-a1000"   //gueest vm name
      vm_type = 1     
      cpu_num = 1           //分配的vcpu数量
      phys_cpu_ids = [0x00]   
      phys_cpu_sets = [0x02]   // vcpu绑定在2核
      entry_point = 0x8100_0000  //linux内核起始地址
      kernel_load_addr = 0x8100_0000  //guest linux vm 镜像加载地址
      dtb_load_addr = 0x82e0_0000     //guest linux dtb 加载地址
      
      image_location = "memory"      //加载方式为从内存加载
      kernel_path = "/mnt/cicv/xh/arceos-hypervisor/a1000_port/image/Image_6.1.54.bin" //guest linux 镜像 所在路径
      dtb_path = "/mnt/cicv/xh/arceos-hypervisor/a1000_port/dts_dtb/bsta1000b-fada-chery-smp1.dtb" //guest linux dtb 所在路径
      # ramdisk_path = ""
      # ramdisk_load_addr = 0
      # disk_path = "disk.img"
      # Memory regions with format (`base_paddr`, `size`, `flags`).
      //guest linux 所使用的物理内存
      memory_regions = [
          [0x8000_0000, 0x7000_0000, 0x7, 1],#ram 1792MB
      ]
      
      
      # Emu_devices
      # Name Base-Ipa Ipa_len Alloc-Irq Emu-Type EmuConfig
      emu_devices = [
      ]
      
      # Pass-through devices
      //guest linux 所控制的直通设备
      passthrough_devices = [
      	["most-devices", 0x0000_0000, 0x0000_0000, 0x8000_0000, 0x1],
      ]
      
      ```

   2. 配置`arceos-umhv/arceos-vmm/configs/vms/arceos-aarch64-hv.toml`文件，配置guest arceos 初始信息

      ```toml
      id = 1          //guest vm id
      name = "arceos"    //guest vm name
      vm_type = 1          // guest vm type
      cpu_num = 1          // guest vcpu num
      phys_cpu_sets = [1]  //将guest vcpu与1核进行绑定
      # entry_point = 0x1_b008_0000
      entry_point = 0x1_b000_0000  //guest arceos 内核启动地址
      
      # The location of image: "memory" | "fs"
      # image_location = "fs" 
      image_location = "memory"    //guest arceos 加载方式为从内存中加载
      # kernel_path = "/mnt/cicv/xh/arceos/examples/helloworld/helloworld_aarch64-bsta1000b.bin"
      kernel_path = "/mnt/cicv/xh/arceos/examples/helloworld/helloworld_aarch64-qemu-virt.bin"   //guest arceos kernel 镜像地址
      # /mnt/cicv/xh/arceos/examples/helloworld/helloworld_aarch64-qemu-virt.bin
      kernel_load_addr = 0x1_b000_0000 //guest arceos 内核加载地址
      
      # bios_path = ""
      # bios_load_addr = 0
      # ramdisk_path = ""
      # ramdisk_load_addr = 0
      # disk_path = ""
      # Memory regions with format (`base_paddr`, `size`, `flags`, `map_type`).
      # For `map_type`, 0 means `MAP_ALLOC`, 1 means `MAP_IDENTICAL`.
      //guest arceos 使用的内存信息
      memory_regions = [
          # [0x8000_0000, 0x0800_0000, 0x7, 1],   # Low RAM		    16M 0b00111 R|W|EXECUTE
          [0x1_b000_0000, 0x0800_0000, 0x7, 1]
      ]
      
      # Emu_devices
      # Name Base-Ipa Ipa_len Alloc-Irq Emu-Type EmuConfig
      emu_devices = []
      
      # Pass-through devices
      # Name Base-Ipa Base-Pa Length Alloc-Irq
      passthrough_devices = [
      
      
          ["uart8250", 0x20008000, 0x20008000, 0x1000, 0x01],   # uart8250 UART0
      
      ]
      ```

      

5. 使用`make A=(pwd) ARCH=aarch64 VM_CONFIGS=configs/vms/linux-a1000-aarch64-smp1.toml:configs/vms/arceos-aarch64.toml PLAT_NAME=aarch64-bsta1000b-virt-hv FEATURES=page-alloc-64g,hv LOG=info SMP=2 fada` 编译出镜像

6. 将镜像替换原有的内核，断电重启

   ```shell
   baudrate: 115200
   
   Load ATF and UBOOT from Zone A
   
   NOTICE:  BL31: Built : 10:13:03, Mar 30 2023
   
   
   U-Boot 2019.04+2.1.1+g8fc26249.202303300858+ (Mar 30 2023 - 08:58:21 +0800)Bst A1000B, Build: jenkins-a1000_uboot_hvte_rootfs_all-4984
   
   Press 'ctrl+C/c' to stop autoboot:  0
   7020 bytes read in 5 ms (1.3 MiB/s)
   normal mode
   8204856 bytes read in 186 ms (42.1 MiB/s)
   62598 bytes read in 12 ms (5 MiB/s)
   ## Loading kernel from FIT Image at 90000000 ...
      Trying 'kernel' kernel subimage
        Description:  ArceOS for BST A1000B
        Type:         Kernel Image
        Compression:  gzip compressed
        Data Start:   0x900000fc
        Data Size:    8143392 Bytes = 7.8 MiB
        Architecture: AArch64
        OS:           Linux
        Load Address: 0x1a0000000
        Entry Point:  0x1a0000000
        Hash algo:    md5
        Hash value:   de3de880d16c71162738fe3a09493347
        Hash algo:    sha1
        Hash value:   b1201ff1b8418e5e2f1f27cf2f3daf0275f9a605
      Verifying Hash Integrity ... md5+ sha1+ OK
   ## Flattened Device Tree blob at 80000000
      Booting using the fdt blob at 0x80000000
      Uncompressing Kernel Image ... load_buf:00000001a0000000,  image_buf:00000000900000fc
   image_len:7c4220 comp:1
   OK
      Loading Device Tree to 00000001ce7ed000, end 00000001ce7ff485 ... OK
   enable hyp val 30
   
   Starting kernel ...
   
   
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = aarch64
   platform = aarch64-bsta1000b-virt-hv
   target = aarch64-unknown-none-softfloat
   build_mode = release
   log_level = info
   smp = 2
   
   [  3.041875 axruntime:130] Logging is enabled.
   [  3.047985 axruntime:131] Primary CPU 0 started, dtb = 0x1ce7ed000.
   [  3.056196 axruntime:133] Found physcial memory regions:
   [  3.063360 axruntime:135]   [PA:0x1a0000000, PA:0x1a0062000) .text (READ | EXECUTE | RESERVED)
   [  3.074146 axruntime:135]   [PA:0x1a0062000, PA:0x1a1901000) .rodata (READ | RESERVED)
   [  3.084172 axruntime:135]   [PA:0x1a1901000, PA:0x1a1909000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  3.096775 axruntime:135]   [PA:0x1a1909000, PA:0x1a1989000) boot stack (READ | WRITE | RESERVED)
   [  3.107851 axruntime:135]   [PA:0x1a1989000, PA:0x1a1baf000) .bss (READ | WRITE | RESERVED)
   [  3.118354 axruntime:135]   [PA:0x1a1baf000, PA:0x1b0000000) free memory (READ | WRITE | FREE)
   [  3.129143 axruntime:135]   [PA:0x80000000, PA:0xf0000000) reserved memory (READ | WRITE | EXECUTE | RESERVED)
   [  3.141460 axruntime:135]   [PA:0x1b0000000, PA:0x1f0000000) reserved memory (READ | WRITE | EXECUTE | RESERVED)
   [  3.153968 axruntime:135]   [PA:0x20008000, PA:0x20009000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.165139 axruntime:135]   [PA:0x32000000, PA:0x32008000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.176310 axruntime:135]   [PA:0x32011000, PA:0x32012000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.187481 axruntime:135]   [PA:0x33002000, PA:0x33003000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.198652 axruntime:135]   [PA:0x70035000, PA:0x70036000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.209824 axruntime:135]   [PA:0x70038000, PA:0x70039000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.220994 axruntime:208] Initialize global memory allocator...
   [  3.228824 axruntime:209]   use TLSF allocator.
   [  3.235195 axmm:60] Initialize virtual memory management...
   [  3.263999 axruntime:150] Initialize platform devices...
   [  3.271067 axhal::platform::aarch64_common::gic:67] Initialize GICv2...
   [  3.279717 axtask::api:73] Initialize scheduling...
   [  3.286374 axtask::api:79]   use FIFO scheduler.
   [  3.292742 axhal::platform::aarch64_common::psci:115] Starting CPU 100 ON ...
   [  3.301975 axruntime:176] Initialize interrupt handlers...
   [  3.301975 axruntime::mp:37] Secondary CPU 1 started.
   [  3.309263 axruntime:186] Primary CPU 0 init OK.
   [  3.316168 axruntime::mp:47] Secondary CPU 1 init OK.
   [  3.329406 0:2 arceos_vmm:17] Starting virtualization...
   [  3.336566 0:2 arceos_vmm:19] Hardware support: true
   [  3.343360 0:6 arceos_vmm::vmm::timer:103] Initing HV Timer...
   [  3.349408 1:7 arceos_vmm::vmm::timer:103] Initing HV Timer...
   [  3.351081 0:6 arceos_vmm::hal:117] Hardware virtualization support enabled on core 0
   [  3.358813 1:7 arceos_vmm::hal:117] Hardware virtualization support enabled on core 1
   [  3.378942 0:2 arceos_vmm::vmm::config:34] Creating VM [0] "linux-a1000"
   [  3.387547 0:2 axvm::vm:113] Setting up memory region: [0x80000000~0xf0000000] READ | WRITE | EXECUTE
   [  3.398997 0:2 arceos_vmm::hal:27] Failed to allocate memory region [PA:0x80000000~PA:0xf0000000]: NoMemory
   [  3.429479 0:2 axvm::vm:156] Setting up passthrough device memory region: [0x0~0x80000000] -> [0x0~0x80000000]
   [  3.462795 0:2 axvm::vm:191] VM created: id=0
   [  3.468812 0:2 axvm::vm:206] VM setup: id=0
   [  3.474734 0:2 arceos_vmm::vmm::config:41] VM[0] created success, loading images...
   [  3.484473 0:2 arceos_vmm::vmm::images:38] Loading VM images from memory
   [  3.528456 0:2 arceos_vmm::vmm::config:34] Creating VM [1] "arceos"
   [  3.536585 0:2 axvm::vm:113] Setting up memory region: [0x1b0000000~0x1b8000000] READ | WRITE | EXECUTE
   [  3.548225 0:2 arceos_vmm::hal:27] Failed to allocate memory region [PA:0x1b0000000~PA:0x1b8000000]: NoMemory
   [  3.561771 0:2 axvm::vm:156] Setting up passthrough device memory region: [0x20008000~0x20009000] -> [0x20008000~0x20009000]
   [  3.575339 0:2 axvm::vm:191] VM created: id=1
   [  3.581443 0:2 axvm::vm:206] VM setup: id=1
   [  3.587364 0:2 arceos_vmm::vmm::config:41] VM[1] created success, loading images...
   [  3.597103 0:2 arceos_vmm::vmm::images:64] Loading VM images from memory
   [  3.605823 0:2 arceos_vmm::vmm:30] Setting up vcpus...
   [  3.612765 0:2 arceos_vmm::vmm::vcpus:178] Initializing VM[0]'s 1 vcpus
   [  3.621353 0:2 arceos_vmm::vmm::vcpus:209] Spawning task for VM[0] Vcpu[0]
   [  3.630239 0:2 arceos_vmm::vmm::vcpus:221] Vcpu task Task(8, "VM[0]-VCpu[0]") created cpumask: [1, ]
   [  3.641597 0:2 arceos_vmm::vmm::vcpus:178] Initializing VM[1]'s 1 vcpus
   [  3.648676 1:8 arceos_vmm::vmm::vcpus:242] VM[0] Vcpu[0] waiting for running
   [  3.650188 0:2 arceos_vmm::vmm::vcpus:209] Spawning task for VM[1] Vcpu[0]
   [  3.668141 0:2 arceos_vmm::vmm::vcpus:221] Vcpu task Task(9, "VM[1]-VCpu[0]") created cpumask: [0, ]
   [  3.679503 0:2 arceos_vmm::vmm:37] VMM starting, booting VMs...
   [  3.687330 0:2 axvm::vm:273] Booting VM[0]
   [  3.693156 0:2 arceos_vmm::vmm:43] VM[0] boot success
   [  3.698675 1:8 arceos_vmm::vmm::vcpus:245] VM[0] Vcpu[0] running...
   [  3.700029 0:2 axvm::vm:273] Booting VM[1]
   [  3.714064 0:2 arceos_vmm::vmm:43] VM[1] boot success
   [  3.720942 0:9 arceos_vmm::vmm::vcpus:242] VM[1] Vcpu[0] waiting for running
   [  3.730010 0:9 arceos_vmm::vmm::vcpus:245] VM[1] Vcpu[0] running...
   a
          d8888                            .d88888b.   .d8888b.
         d88888                           d88P" "Y88b d88P  Y88b
        d88P888                           888     888 Y88b.
       d88P 888 888d888  .d8888b  .d88b.  888     888  "Y888b.
      d88P  888 888P"   d88P"    d8P  Y8b 888     888     "Y88b.
     d88P   888 888     888      88888888 888     888       "888
    d8888888888 888     Y88b.    Y8b.     Y88b. .d88P Y88b  d88P
   d88P     888 888      "Y8888P  "Y8888   "Y88888P"   "Y8888P"
   
   arch = aarch64
   platform = aarch64-qemu-virt
   target = aarch64-unknown-none-softfloat
   build_mode = release
   log_level = debug
   smp = 1
   
   [  3.805794 0 axruntime:130] Logging is enabled.
   [  3.812095 0 axruntime:131] Primary CPU 0 started, dtb = 0x0.
   [  3.819733 0 axruntime:133] Found physcial memory regions:
   [  3.827086 0 axruntime:135]   [PA:0x1b0000000, PA:0x1b0007000) .text (READ | EXECUTE | RESERVED)
   [  3.838065 0 axruntime:135]   [PA:0x1b0007000, PA:0x1b0009000) .rodata (READ | RESERVED)
   [  3.848281 0 axruntime:135]   [PA:0x1b0009000, PA:0x1b000d000) .data .tdata .tbss .percpu (READ | WRITE | RESERVED)
   [  3.861076 0 axruntime:135]   [PA:0x1b000d000, PA:0x1b004d000) boot stack (READ | WRITE | RESERVED)
   [  3.872342 0 axruntime:135]   [PA:0x1b004d000, PA:0x1b004e000) .bss (READ | WRITE | RESERVED)
   [  3.883036 0 axruntime:135]   [PA:0x1b004e000, PA:0x1b8000000) free memory (READ | WRITE | FREE)
   [  3.894017 0 axruntime:135]   [PA:0x20008000, PA:0x20009000) mmio (READ | WRITE | DEVICE | RESERVED)
   [  3.905379 0 axruntime:150] Initialize platform devices...
   [  3.912731 0 axruntime:188] Primary CPU 0 init OK.
   Hello, world!
   [    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd050]
   [    0.000000] Linux version 6.1.54-rt15-00068-g09f2347c9237 (tanghanwe@ubuntu-virtual-machine) (aarch64-linux-gnu-gcc (Ubuntu 9.4.0-15
   [    0.000000] Machine model: BST A1000B FAD-A
   [    0.000000] earlycon: uart8250 at MMIO32 0x0000000020008000 (options '')
   [    0.000000] printk: bootconsole [uart8250] enabled
   [    0.000000] Invalid option string for rodata: 'n'
   [    0.000000] Reserved memory: created DMA memory pool at 0x000000008b000000, size 32 MiB
   [    0.000000] OF: reserved mem: initialized node bst_atf@8b000000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created DMA memory pool at 0x000000008fec0000, size 0 MiB
   [    0.000000] OF: reserved mem: initialized node bst_tee@8fec0000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created DMA memory pool at 0x000000008ff00000, size 1 MiB
   [    0.000000] OF: reserved mem: initialized node bstn_cma@8ff00000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created DMA memory pool at 0x000000009a000000, size 32 MiB
   [    0.000000] OF: reserved mem: initialized node bst_cv_cma@9a000000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created DMA memory pool at 0x000000009c000000, size 16 MiB
   [    0.000000] OF: reserved mem: initialized node vsp@0x9c000000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created DMA memory pool at 0x00000000a1000000, size 16 MiB
   [    0.000000] OF: reserved mem: initialized node bst_isp@0xa1000000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created CMA memory pool at 0x00000000b2000000, size 864 MiB
   [    0.000000] OF: reserved mem: initialized node coreip_pub_cma@0xb2000000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created CMA memory pool at 0x00000000e8000000, size 8 MiB
   [    0.000000] OF: reserved mem: initialized node noc_pmu@0xe8000000, compatible id shared-dma-pool
   [    0.000000] Reserved memory: created CMA memory pool at 0x00000000e8800000, size 8 MiB
   [    0.000000] OF: reserved mem: initialized node canfd@0xe8800000, compatible id shared-dma-pool
   [    0.000000] Zone ranges:
   [    0.000000]   DMA      [mem 0x0000000080000000-0x00000000efffffff]
   [    0.000000]   DMA32    empty
   [    0.000000]   Normal   empty
   [    0.000000] Movable zone start for each node
   [    0.000000] Early memory node ranges
   [    0.000000]   node   0: [mem 0x0000000080000000-0x000000008affffff]
   [    0.000000]   node   0: [mem 0x000000008b000000-0x000000008cffffff]
   [    0.000000]   node   0: [mem 0x000000008d000000-0x000000008fcfffff]
   [    0.000000]   node   0: [mem 0x000000008fd00000-0x000000008fdfffff]
   [    0.000000]   node   0: [mem 0x000000008fe00000-0x000000008febffff]
   [    0.000000]   node   0: [mem 0x000000008fec0000-0x00000000b1ffffff]
   [    0.000000]   node   0: [mem 0x00000000b2000000-0x00000000efffffff]
   [    0.000000] Initmem setup node 0 [mem 0x0000000080000000-0x00000000efffffff]
   [    0.000000] cma: Reserved 128 MiB at 0x0000000083000000
   [    0.000000] psci: probing for conduit method from DT.
   [    0.000000] psci: Using PSCI v0.1 Function IDs from DT
   [    0.000000] percpu: Embedded 19 pages/cpu s40872 r8192 d28760 u77824
   [    0.000000] Detected VIPT I-cache on CPU0
   [    0.000000] CPU features: detected: Qualcomm erratum 1009, or ARM erratum 1286807, 2441009
   [    0.000000] CPU features: detected: ARM errata 1165522, 1319367, or 1530923
   [    0.000000] alternatives: applying boot alternatives
   [    0.000000] Built 1 zonelists, mobility grouping on.  Total pages: 451584
   [    0.000000] Kernel command line: earlycon=uart8250,mmio32,0x20008000 console=ttyS0,115200n8 memreserve=64M@0xf8000000 rdinit=/sbin/n
   [    0.000000] Unknown kernel command line parameters "memreserve=64M@0xf8000000", will be passed to user space.
   [    0.000000] Dentry cache hash table entries: 262144 (order: 9, 2097152 bytes, linear)
   [    0.000000] Inode-cache hash table entries: 131072 (order: 8, 1048576 bytes, linear)
   [    0.000000] mem auto-init: stack:off, heap alloc:off, heap free:off
   [    0.000000] Memory: 148300K/1835008K available (11392K kernel code, 7766K rwdata, 3884K rodata, 1856K init, 2597K bss, 654516K rese)
   [    0.000000] SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=1, Nodes=1
   [    0.000000] rcu: Hierarchical RCU implementation.
   [    0.000000] rcu:     RCU restricting CPUs from NR_CPUS=8 to nr_cpu_ids=1.
   [    0.000000]  Tracing variant of Tasks RCU enabled.
   [    0.000000] rcu: RCU calculated value of scheduler-enlistment delay is 10 jiffies.
   [    0.000000] rcu: Adjusting geometry for rcu_fanout_leaf=16, nr_cpu_ids=1
   [    0.000000] NR_IRQS: 64, nr_irqs: 64, preallocated irqs: 0
   [    0.000000] Root IRQ handler: gic_handle_irq
   [    0.000000] rcu: srcu_init: Setting srcu_struct sizes based on contention.
   [    0.000000] arch_timer: cp15 timer(s) running at 325.00MHz (virt).
   [    0.000000] clocksource: arch_sys_counter: mask: 0x7ffffffffffffff max_cycles: 0x4af477f6aa, max_idle_ns: 440795207830 ns
   [    0.000000] sched_clock: 59 bits at 325MHz, resolution 3ns, wraps every 4398046511103ns
   [    0.009203] Console: colour dummy device 80x25
   [    0.014105] Calibrating delay loop (skipped), value calculated using timer frequency.. 650.00 BogoMIPS (lpj=3250000)
   [    0.025674] pid_max: default: 32768 minimum: 301
   [    0.030832] LSM: Security Framework initializing
   [    0.035944] SELinux:  Initializing.
   [    0.039963] Mount-cache hash table entries: 4096 (order: 3, 32768 bytes, linear)
   [    0.048098] Mountpoint-cache hash table entries: 4096 (order: 3, 32768 bytes, linear)
   [    0.057524] cacheinfo: Unable to detect cache hierarchy for CPU 0
   [    0.064574] cblist_init_generic: Setting adjustable number of callback queues.
   [    0.072506] cblist_init_generic: Setting shift to 0 and lim to 1.
   [    0.079357] rcu: Hierarchical SRCU implementation.
   [    0.079359] rcu:     Max phase no-delay instances is 1000.
   [    0.079396] printk: bootconsole [uart8250] printing thread started
   [    0.090833] smp: Bringing up secondary CPUs ...
   [    0.090836] smp: Brought up 1 node, 1 CPU
   [    0.090841] SMP: Total of 1 processors activated.
   [    0.090847] CPU features: detected: 32-bit EL0 Support
   [    0.090852] CPU features: detected: Data cache clean to the PoU not required for I/D coherence
   [    0.090856] CPU features: detected: Common not Private translations
   [    0.090858] CPU features: detected: CRC32 instructions
   [    0.090864] CPU features: detected: RCpc load-acquire (LDAPR)
   [    0.090866] CPU features: detected: Privileged Access Never
   [    0.090869] CPU features: detected: RAS Extension Support
   [    0.090920] CPU: All CPU(s) started at EL1
   [    0.090923] alternatives: applying system-wide alternatives
   [    0.092365] devtmpfs: initialized
   [    0.112929] clocksource: jiffies: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 19112604462750000 ns
   [    0.112943] futex hash table entries: 256 (order: 2, 16384 bytes, linear)
   [    0.143754] pinctrl core: initialized pinctrl subsystem
   [    0.144394] NET: Registered PF_NETLINK/PF_ROUTE protocol family
   [    0.145208] DMA: preallocated 256 KiB GFP_KERNEL pool for atomic allocations
   [    0.145267] DMA: preallocated 256 KiB GFP_KERNEL|GFP_DMA pool for atomic allocations
   [    0.145333] DMA: preallocated 256 KiB GFP_KERNEL|GFP_DMA32 pool for atomic allocations
   [    0.328274] printk: console [ttyS0] enabled
   [    0.328278] printk: bootconsole [uart8250] disabled
   [    0.328291] printk: bootconsole [uart8250] printing thread stopped
   [    0.328548] dw-apb-uart 2000a000.serial: uart clock frequency (&p->uartclk):25000000
   [    0.328553] dw-apb-uart 2000a000.serial: uart clock frequency (baudclk):25000000
   [    0.328557] dw-apb-uart 2000a000.serial: uart clock frequency (apb_pclk):100000000
   [    0.328665] 2000a000.serial: ttyS1 at MMIO 0x2000a000 (irq = 32, base_baud = 1562500) is a 16550A
   [    0.328889] dw-apb-uart 20009000.serial: uart clock frequency (&p->uartclk):25000000
   [    0.328894] dw-apb-uart 20009000.serial: uart clock frequency (baudclk):25000000
   [    0.328898] dw-apb-uart 20009000.serial: uart clock frequency (apb_pclk):100000000
   [    0.328996] 20009000.serial: ttyS2 at MMIO 0x20009000 (irq = 33, base_baud = 1562500) is a 16550A
   [    0.329813] =======lt9211_probe in...
   [    0.329816] =======lt9211_probe in1...
   [    0.329818] nlt9211 4-002d: =======lt9211_probe in2...
   [    0.329900] max96789 1-0040: *************MAX96789 RGB To MIPIDSI Config*************
   [    0.329935] printk: console [ttyS0] printing thread started
   [    0.412081] ====update_chnl_id in ...!
   [    0.649752] MAX config start
   [    1.999794] End of MAX config status 0
   [    1.999945] Mali<2>:
   [    1.999947] Inserting Mali v900 device driver.
   [    1.999950] Mali<2>:
   [    1.999950] Compiled: Jan 22 2025, time: 15:53:22.
   [    1.999953] Mali<2>:
   [    1.999954] Driver revision: -6.1.54.REL.B231218-68-g09f2347c9237
   [    1.999956] Mali<2>:
   [    1.999957] mali_module_init() registering driver
   [    2.000028] Mali<2>:
   [    2.000029] mali_probe(): Called for platform device 33300000.gpu
   [    2.000113] Mali<2>:
   [    2.000114] mali-450 device tree detected.
   [    2.000252] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPP2 not found
   [    2.000260] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPPMMU2 not found
   [    2.000265] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPP3 not found
   [    2.000271] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPPMMU3 not found
   [    2.000276] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPP4 not found
   [    2.000282] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPPMMU4 not found
   [    2.000286] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPP5 not found
   [    2.000292] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPPMMU5 not found
   [    2.000297] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPP6 not found
   [    2.000302] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPPMMU6 not found
   [    2.000307] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPP7 not found
   [    2.000311] mali-utgard 33300000.gpu: error -ENXIO: IRQ IRQPPMMU not found
   [    2.000437] Mali<2>:
   [    2.000439] Mali SWAP: Swap out threshold vaule is 60M
   [    2.000453] Mali<2>:
   [    2.000454] Mali memory settings (shared: 0xFFFFFFFF)
   [    2.000458] Mali<2>:
   [    2.000459] Using device defined frame buffer settings (0x01000000@0xB8000000)
   [    2.000463] Mali<2>:
   [    2.000464] Memory Validator installed for Mali physical address base=0xB8000000, size=0x01000000
   [    2.000469] Mali<2>:
   [    2.000471] Mali PMU: Creating Mali PMU core
   [    2.000477] Mali<2>:
   [    2.000478] Couldn't find pmu_switch_delay in device tree configuration.
   [    2.000481] Mali<2>:
   [    2.000482] Get pmu config from device tree configuration.
   [    2.000484] Mali<2>:
   [    2.000485] Using hw detect pmu config:
   [    2.000488] Mali<2>:
   [    2.000490] domain_config[0] = 0x1
   [    2.000492] Mali<2>:
   [    2.000493] domain_config[1] = 0x2
   [    2.000495] Mali<2>:
   [    2.000496] domain_config[2] = 0x4
   [    2.000498] Mali<2>:
   [    2.000499] domain_config[9] = 0x1
   [    2.000501] Mali<2>:
   [    2.000502] domain_config[10] = 0x2
   [    2.000505] Mali<2>:
   [    2.000506] Mali PM domain: Creating Mali PM domain (mask=0x00000001)
   [    2.000508] Mali<2>:
   [    2.000509] Mali PM domain: Creating Mali PM domain (mask=0x00000002)
   [    2.000511] Mali<2>:
   [    2.000512] Mali PM domain: Creating Mali PM domain (mask=0x00000004)
   [    2.000514] Mali<2>:
   [    2.000515] Mali PM domain: Creating Mali PM domain (mask=0x00001000)
   [    2.000521] Mali<2>:
   [    2.000522] Broadcast: Creating Mali Broadcast unit: Mali_Broadcast
   [    2.000533] Mali<2>:
   [    2.000534] Mali PP: Creating Mali PP core: Mali_PP0
   [    2.000535] Mali<2>:
   [    2.000536] Mali PP: Base address of PP core: 0x33308000
   [    2.000589] Mali<2>:
   [    2.000590] Found Mali GPU Mali-450 MP r0p0
   [    2.000648] Mali<2>:
   [    2.000650] Mali DLBU: Initializing
   [    2.000666] Mali<2>:
   [    2.000667] Mali L2 cache: Created Mali_L2:   8K, 4-way, 64byte cache line, 128bit external bus
   [    2.000675] Mali<2>:
   [    2.000676] Mali L2 cache: Created Mali_L2:  64K, 4-way, 64byte cache line, 128bit external bus
   [    2.000686] Mali<2>:
   [    2.000688] Mali MMU: Creating Mali MMU: Mali_GP_MMU
   [    2.000709] Mali<2>:
   [    2.000711] mali_mmu_probe_irq_acknowledge: intstat 0x3
   [    2.000713] Mali<2>:
   [    2.000714] Probe: Page fault detect: PASSED
   [    2.000716] Mali<2>:
   [    2.000717] Probe: Bus read error detect: PASSED
   [    2.000726] Mali<2>:
   [    2.000727] Mali GP: Creating Mali GP core: Mali_GP
   [    2.000769] Mali<2>:
   [    2.000770] Mali MMU: Creating Mali MMU: Mali_PP0_MMU
   [    2.000789] Mali<2>:
   [    2.000790] mali_mmu_probe_irq_acknowledge: intstat 0x3
   [    2.000792] Mali<2>:
   [    2.000793] Probe: Page fault detect: PASSED
   [    2.000794] Mali<2>:
   [    2.000796] Probe: Bus read error detect: PASSED
   [    2.000804] Mali<2>:
   [    2.000805] Mali PP: Creating Mali PP core: Mali_PP0
   [    2.000806] Mali<2>:
   [    2.000807] Mali PP: Base address of PP core: 0x33308000
   [    2.000838] Mali<2>:
   [    2.000840] Mali MMU: Creating Mali MMU: Mali_PP1_MMU
   [    2.000865] Mali<2>:
   [    2.000867] mali_mmu_probe_irq_acknowledge: intstat 0x3
   [    2.000869] Mali<2>:
   [    2.000870] Probe: Page fault detect: PASSED
   [    2.000871] Mali<2>:
   [    2.000872] Probe: Bus read error detect: PASSED
   [    2.000881] Mali<2>:
   [    2.000882] Mali PP: Creating Mali PP core: Mali_PP1
   [    2.000883] Mali<2>:
   [    2.000884] Mali PP: Base address of PP core: 0x3330a000
   [    2.000909] Mali<2>:
   [    2.000910] Starting new virtual group for MMU PP broadcast core Mali_PP_MMU_Broadcast
   [    2.000912] Mali<2>:
   [    2.000913] Mali DLBU: Creating Mali dynamic load balancing unit: Mali_DLBU
   [    2.000918] Mali<2>:
   [    2.000919] Broadcast: Creating Mali Broadcast unit: Mali_Broadcast
   [    2.000925] Mali<2>:
   [    2.000926] Mali MMU: Creating Mali MMU: Mali_PP_MMU_Broadcast
   [    2.000930] Mali<2>:
   [    2.000931] Mali PP: Creating Mali PP core: Mali_PP_Broadcast
   [    2.000932] Mali<2>:
   [    2.000933] Mali PP: Base address of PP core: 0x33316000
   [    2.000971] Mali<2>:
   [    2.000972] 2+0 PP cores initialized
   [    2.000985] Mali<2>:
   [    2.000987] Mali GPU Timer: 1000
   [    2.000990] Mali<2>:
   [    2.000990] Mali GPU Utilization: No platform utilization handler installed
   [    2.000993] Mali<2>:
   [    2.000994] Mali DVFS init: platform function callback incomplete, need check mali_gpu_device_data in platform .
   [    2.001356] Mali<2>:
   [    2.001358] mali_probe(): Successfully initialized driver for platform device 33300000.gpu
   [    2.001417] Mali:
   [    2.001419] Mali device driver loaded
   [    2.001470] cacheinfo: Unable to detect cache hierarchy for CPU 0
   [    2.006214] brd: module loaded
   [    2.008623] loop: module loaded
   [    2.009038] null_blk: disk nullb0 created
   [    2.009042] null_blk: module loaded
   [    2.009046] dummy-irq: no IRQ given.  Use irq=N
   [    2.010260] slave@0 enforce active low on chipselect handle
   [    2.021387] qspi0-nor0@0 enforce active low on chipselect handle
   [    2.179081] spi-nor spi6.0: w25q256jw (32768 Kbytes)
   [    2.179172] 2 fixed-partitions partitions found on MTD device spi6.0
   [    2.179176] Creating 2 MTD partitions on "spi6.0":
   [    2.179189] 0x000000000000-0x000001e00000 : "nor0_part0"
   [    2.179739] 0x000001e00000-0x000002000000 : "nor0_part1"
   [    2.181991] bst_canfd 20016000.canfd: Driver registered: regs=0xffffffc009f54000, irq=44, clock=200000000
   [    2.182428] bst_canfd 20016800.canfd: Driver registered: regs=0xffffffc009f58800, irq=45, clock=200000000
   [    2.182935] bst_canfd 20017000.canfd: Driver registered: regs=0xffffffc009f5c000, irq=46, clock=200000000
   [    2.183054] CAN device driver interface
   [    2.183100] usbcore: registered new interface driver asix
   [    2.183131] usbcore: registered new interface driver ax88179_178a
   [    2.183156] usbcore: registered new interface driver cdc_ether
   [    2.183175] usbcore: registered new interface driver net1080
   [    2.183192] usbcore: registered new interface driver cdc_subset
   [    2.183208] usbcore: registered new interface driver zaurus
   [    2.183239] usbcore: registered new interface driver cdc_ncm
   [    2.183263] usbcore: registered new interface driver r8153_ecm
   [    2.183804] dwc3,usb:dwc3_set_reqinfo_len,1082
   [    2.190672] bst-dwc3 amba_apu@0:usb2: usb30 could not find power control gpio.
   [    2.190896] dwc3,usb:dwc3_set_reqinfo_len,1082
   [    2.191939] xhci-hcd xhci-hcd.0.auto: xHCI Host Controller
   [    2.191956] xhci-hcd xhci-hcd.0.auto: new USB bus registered, assigned bus number 1
   [    2.192359] xhci-hcd xhci-hcd.0.auto: hcc params 0x0220fe64 hci version 0x110 quirks 0x0000000000010010
   [    2.192392] xhci-hcd xhci-hcd.0.auto: irq 47, io mem 0x30200000
   [    2.192515] xhci-hcd xhci-hcd.0.auto: xHCI Host Controller
   [    2.192523] xhci-hcd xhci-hcd.0.auto: new USB bus registered, assigned bus number 2
   [    2.192530] xhci-hcd xhci-hcd.0.auto: Host supports USB 3.0 SuperSpeed
   [    2.192901] hub 1-0:1.0: USB hub found
   [    2.192934] hub 1-0:1.0: 1 port detected
   [    2.193097] usb usb2: We don't know the algorithms for LPM for this host, disabling LPM.
   [    2.193357] hub 2-0:1.0: USB hub found
   [    2.193381] hub 2-0:1.0: 1 port detected
   [    2.193626] usbcore: registered new interface driver uas
   [    2.193670] usbcore: registered new interface driver usb-storage
   [    2.193736] usbcore: registered new interface driver option
   [    2.193749] usbserial: USB Serial support registered for GSM modem (1-port)
   [    2.193848] gadgetfs: USB Gadget filesystem, version 24 Aug 2004
   [    2.193950] i2c_dev: i2c /dev entries driver
   [    2.194458] bst,maxim-deser-hub 2-0029: maxim_hub_parse_dt() line:1255 GMSL2
   [    2.194468] bst,maxim-deser-hub 2-0029: lane-num = 2
   [    2.194491] bst,maxim-deser-hub 2-0029: trigger-tx-gpio index0  = 8
   [    2.194496] bst,maxim-deser-hub 2-0029: camera index is 0,ser is 42,ser_alias is 60,sensor addr is 36, sensor_i2c_addr_alias is 70
   [    2.194505] bst,maxim-deser-hub 2-0029: parse_input_dt:: input device1 not found
   [    2.194515] bst,maxim-deser-hub 2-0029: parse_input_dt:: input device2 not found
   [    2.194527] bst,maxim-deser-hub 2-0029: parse_input_dt:: input device3 not found
   [    2.246055] bst,maxim-deser-hub 2-0029: read_back REG_ENABLE : 0x14
   [    2.251854] bst,maxim-deser-hub 2-0029: read_back REG_MNL : 0x10
   [    2.251864] bst,maxim-deser-hub 2-0029: maxim_hub_probe: lock gpio -2 is invalid
   [    2.359981] maxim hub probe done
   [    2.360116] bst,maxim-deser-hub 2-002a: maxim_hub_parse_dt() line:1255 GMSL2
   [    2.360136] bst,maxim-deser-hub 2-002a: trigger-tx-gpio index0  = 0
   [    2.360141] bst,maxim-deser-hub 2-002a: camera index is 0,ser is 42,ser_alias is 64,sensor addr is 36, sensor_i2c_addr_alias is 54
   [    2.360156] bst,maxim-deser-hub 2-002a: trigger-tx-gpio index1  = 0
   [    2.360161] bst,maxim-deser-hub 2-002a: camera index is 1,ser is 42,ser_alias is 65,sensor addr is 36, sensor_i2c_addr_alias is 55
   [    2.360177] bst,maxim-deser-hub 2-002a: trigger-tx-gpio index2  = 0
   [    2.360182] bst,maxim-deser-hub 2-002a: camera index is 2,ser is 42,ser_alias is 66,sensor addr is 36, sensor_i2c_addr_alias is 56
   [    2.360198] bst,maxim-deser-hub 2-002a: trigger-tx-gpio index3  = 0
   [    2.360203] bst,maxim-deser-hub 2-002a: camera index is 3,ser is 42,ser_alias is 67,sensor addr is 36, sensor_i2c_addr_alias is 57
   [    2.428511] bst,maxim-deser-hub 2-002a: read_back REG_ENABLE : 0x14
   [    2.435440] bst,maxim-deser-hub 2-002a: read_back REG_MNL : 0x10
   [    2.435449] bst,maxim-deser-hub 2-002a: maxim_hub_probe: lock gpio -2 is invalid
   [    2.543722] maxim hub probe done
   [    2.543952] bst,maxim-deser-hub 2-002e: maxim_hub_parse_dt() line:1255 GMSL2
   [    2.543960] bst,maxim-deser-hub 2-002e: lane-num = 2
   [    2.543975] bst,maxim-deser-hub 2-002e: trigger-tx-gpio index0  = 8
   [    2.543980] bst,maxim-deser-hub 2-002e: camera index is 0,ser is 42,ser_alias is 48,sensor addr is 36, sensor_i2c_addr_alias is 58
   [    2.543990] bst,maxim-deser-hub 2-002e: parse_input_dt:: input device1 not found
   [    2.543995] bst,maxim-deser-hub 2-002e: parse_input_dt:: input port2 not found
   [    2.543995]
   [    2.544000] bst,maxim-deser-hub 2-002e: parse_input_dt:: input port3 not found
   [    2.544000]
   [    2.596048] i2c_transfer error, slave = 0x2e, reg = 0x17, ret = -121
   [    2.617712] i2c_transfer error, slave = 0x2e, reg = 0x17, ret = -121
   [    2.628477] i2c_transfer error, slave = 0x2e, reg = 0x17, ret = -121
   [    2.633481] write_reg() line:177, write 2e:[17,14]failed!
   [    2.633486] bst,maxim-deser-hub 2-002e: max96712_reg_write: write 0x17 failed
   [    2.641093] i2c_transfer error, slave = 0x2e, reg = 0x19, ret = -121
   [    2.648385] i2c_transfer error, slave = 0x2e, reg = 0x19, ret = -121
   [    2.656981] i2c_transfer error, slave = 0x2e, reg = 0x19, ret = -121
   [    2.661984] write_reg() line:177, write 2e:[19,10]failed!
   [    2.661988] bst,maxim-deser-hub 2-002e: max96712_reg_write: write 0x19 failed
   [    2.669782] i2c_transfer error, slave = 0x2e, reg = 0x17, ret = -121
   [    2.681765] i2c_transfer error, slave = 0x2e, reg = 0x17, ret = -121
   [    2.699231] i2c_transfer error, slave = 0x2e, reg = 0x17, ret = -121
   [    2.704236] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x17,0x74]failed!
   [    2.704241] bst,maxim-deser-hub 2-002e: read_back REG_ENABLE : 0x74
   [    2.706534] i2c_transfer error, slave = 0x2e, reg = 0x19, ret = -121
   [    2.721833] i2c_transfer error, slave = 0x2e, reg = 0x19, ret = -121
   [    2.730518] i2c_transfer error, slave = 0x2e, reg = 0x19, ret = -121
   [    2.735523] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x19,0x74]failed!
   [    2.735529] bst,maxim-deser-hub 2-002e: read_back REG_MNL : 0x74
   [    2.735538] bst,maxim-deser-hub 2-002e: maxim_hub_probe: lock gpio -2 is invalid
   [    2.741656] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.752880] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.761914] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.766918] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x0,0x0]failed!
   [    2.807958] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.818290] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.832877] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.837882] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x0,0x0]failed!
   [    2.878198] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.888876] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.899817] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.904822] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x0,0x0]failed!
   [    2.951156] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.965569] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.989650] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    2.994655] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x0,0x0]failed!
   [    3.035950] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    3.059508] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    3.068798] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    3.073802] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x0,0x0]failed!
   [    3.118634] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    3.131052] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    3.142345] i2c_transfer error, slave = 0x2e, reg = 0x0, ret = -121
   [    3.147350] bst,maxim-deser-hub 2-002e: max96712_reg_read() line:256, read 0x2e:[0x0,0x0]failed!
   [    3.189046] bst,maxim-deser-hub 2-002e: detect max96712 timeout
   [    3.189049] bst,maxim-deser-hub 2-002e: maxim_hub_probe: not found max96712
   [    3.189058] bst,maxim-deser-hub: probe of 2-002e failed with error -22
   [    3.189676] a1000-csi2 csi@0: a1000_csi_probe
   [    3.189682] a1000-csi2 csi@0: a1000_csi_probe
   [    3.189708] mipi chn 0 connected
   [    3.189712] mipi chn 1 connected
   [    3.189716] mipi chn 2 connected
   [    3.189719] mipi chn 3 connected
   [    3.189835] a1000-csi2 csi@1: a1000_csi_probe
   [    3.189840] a1000-csi2 csi@1: a1000_csi_probe
   [    3.189861] mipi chn 0 connected
   [    3.189865] mipi chn 1 connected
   [    3.189869] mipi chn 2 connected
   [    3.189873] mipi chn 3 connected
   [    3.189971] a1000-csi2 csi@3: a1000_csi_probe
   [    3.189976] a1000-csi2 csi@3: a1000_csi_probe
   [    3.189993] mipi chn 0 connected
   [    3.189997] mipi chn 1 connected
   [    3.190000] mipi chn 2 not connected
   [    3.190003] mipi chn 3 not connected
   [    3.190172] bst_wdt 2001b000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.190935] bst_wdt 2001c000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.191072] bst_wdt 2001d000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.191202] bst_wdt 32009000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.191405] bst_wdt 3200a000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.191578] bst_wdt 3200b000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.191752] bst_wdt 3200c000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.191939] bst_wdt 3200d000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.192109] bst_wdt 3200e000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.192301] bst_wdt 3200f000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.192467] bst_wdt 32010000.watchdog: wdt bst_wdt_drv_probe, 517
   [    3.192774] sdhci: Secure Digital Host Controller Interface driver
   [    3.192777] sdhci: Copyright(c) Pierre Ossman
   [    3.192778] sdhci-pltfm: SDHCI platform and OF driver helper
   [    3.192969] sdhci-dwcmshc 30400000.dwmmc0: dwcmshc_probe
   [    3.257851] mmc0: SDHCI controller on 30400000.dwmmc0 [30400000.dwmmc0] using ADMA
   [    3.258001] sdhci-dwcmshc 30500000.dwmmc1: dwcmshc_probe
   [    3.504668] mmc0: new high speed MMC card at address 0001
   [    3.505324] mmcblk0: mmc0:0001 CJUD4R 59.6 GiB
   [    3.577787]  mmcblk0: p1 p2 p3 p4 p5 p6 p7 p8 p9 p10
   [    3.579269] mmcblk0boot0: mmc0:0001 CJUD4R 31.9 MiB
   [    3.581351] mmcblk0boot1: mmc0:0001 CJUD4R 31.9 MiB
   [    3.595544] mmcblk0rpmb: mmc0:0001 CJUD4R 4.00 MiB, chardev (239:0)
   [    4.339768] i2c_designware 20005000.i2c: controller timed out
   [    4.339788] sdhci_bst_i2c_write_bytes: i2c write failed: -110
   [    5.379754] i2c_designware 20005000.i2c: controller timed out
   [    5.379760] sdhci_bst_i2c_read_bytes:  i2c read 1 bytes from client@0x8 starting at reg 0x8d failed, error: -110
   [    5.379765] sdhci_bst_i2c_voltage_sel: i2c test failed readdata: 255 send data:1
   [    5.379768] sdhci_bst_voltage_switch failed
   [    5.418222] mmc1: SDHCI controller on 30500000.dwmmc1 [30500000.dwmmc1] using ADMA
   [    5.418423] hid: raw HID events driver (C) Jiri Kosina
   [    5.418636] optee: probing for conduit method.
   [    5.418663] optee: revision 3.11 (28993363)
   [    5.419063] optee: initialized driver
   [    5.419965] netem: version 1.3
   [    5.419985] u32 classifier
   [    5.419986]     Performance counters on
   [    5.419987]     input device check on
   [    5.419988]     Actions configured
   [    5.420100] ipip: IPv4 and MPLS over IPv4 tunneling driver
   [    5.420443] gre: GRE over IPv4 demultiplexor driver
   [    5.420810] NET: Registered PF_INET6 protocol family
   [    5.434247] Segment Routing with IPv6
   [    5.434270] In-situ OAM (IOAM) with IPv6
   [    5.434305] sit: IPv6, IPv4 and MPLS over IPv4 tunneling driver
   [    5.434904] NET: Registered PF_PACKET protocol family
   [    5.434908] can: controller area network core
   [    5.434948] NET: Registered PF_CAN protocol family
   [    5.434953] can: raw protocol
   [    5.434959] 8021q: 802.1Q VLAN Support v1.8
   [    5.435003] sctp: Hash tables configured (bind 256/256)
   [    5.435180] Key type dns_resolver registered
   [    5.435268] ipc 4fec00000.ipc: assigned reserved memory node bstn_cma@8ff00000
   [    5.435621] Loading compiled-in X.509 certificates
   [    5.510900] [bst_cv]: bst_cv_probe 48: BST_CV driver initializing ...
   [    5.510916] [bst_cv]: bst_cv_probe 66: bst_sysfile_init OK
   [    5.510923] [bst_cv]: bst_cv_mem_manager_init 307: phys_to_bus_offset: 0x0
   [    5.510928] [bst_cv]: bst_cv_mem_manager_init 314: dma_set_coherent_mask OK.
   [    5.511059] bst_cv 51030000.bst_cv: assigned reserved memory node bst_cv_cma@9a000000
   [    5.511063] [bst_cv]: bst_cv_mem_manager_init 328: kern_sub_phys_offset: 0xffffffbf78000000
   [    5.511068] [bst_cv]: bst_cv_probe 74: bst_cv_mem_manager_init OK
   [    5.511111] [bst_cv]: bst_cv_probe 82: bst_cv_fw_manager_init OK
   [    5.511184] [bst_cv]: bst_cv_probe 90: bst_cv_misc_init OK, /dev/bst_cv registered
   [    5.511188] [bst_cv]: bst_cv_probe 96: bst_cv probe completed!
   [    5.511304] [bst_lwnn]: bst_lwnn_probe 74: bst_lwnn driver initializing ...
   [    5.511321] [bst_lwnn]: bst_lwnn_probe 93: bst_sysfile_init OK, /sys/kernel/bst_lwnn registered
   [    5.511327] [bst_lwnn]: bst_lwnn_mem_manager_init 346: phys_to_bus_offset: 0x0
   [    5.511331] [bst_lwnn]: bst_lwnn_mem_manager_init 353: dma_set_coherent_mask OK.
   [    5.511355] bst_lwnn 51030000.bst_lwnn: assigned reserved memory node coreip_pub_cma@0xb2000000
   [    5.511360] [bst_lwnn]: bst_lwnn_probe 101: bst_lwnn_mem_manager_init OK
   [    5.511700] [bst_lwnn]: bst_lwnn_probe 109: bst_lwnn_fw_manager_init OK
   [    5.511751] [bst_lwnn]: bst_lwnn_msg_manager_init 302: ipc_init OK
   [    5.511871] [bst_lwnn]: bst_lwnn_msg_manager_init 334: worker creation OK
   [    5.511876] [bst_lwnn]: bst_lwnn_probe 117: bst_lwnn_msg_manager_init OK
   [    5.511936] [bst_lwnn]: bst_lwnn_probe 125: bst_lwnn_misc_init OK, /dev/bst_lwnn registered
   [    5.511941] [bst_lwnn]: bst_lwnn_probe 133: bst_lwnn probe completed!
   [    5.512064] [bstn]: bstn_probe 50: BSTN driver initializing ...
   [    5.512068] [bstn]: bstn_probe 51: timeout_jiffies: 3200, timeout_ms 32000
   [    5.512077] [bstn]: bstn_mem_manager_init 310: phys_to_bus_offset: 0x0
   [    5.512083] [bstn]: bstn_mem_manager_init 324: reserved memory: base 0xb2000000 size 0x36000000
   [    5.512088] [bstn]: bstn_mem_manager_init 333: dma_set_mask OK.
   [    5.512091] [bstn]: bstn_mem_manager_init 340: dma_set_coherent_mask OK.
   [    5.512097] bstn 50020000.bstn: assigned reserved memory node coreip_pub_cma@0xb2000000
   [    5.512101] [bstn]: bstn_probe 76: bstn_mem_manager_init OK
   [    5.512119] [bstn]: bstn_fw_manager_init 300: firmware: bstn_dsp_rtos.rbf
   [    5.512165] [bstn]: bstn_fw_manager_init 320: assigned mem: 0xffffffc00a232000, 0xb2005000, size: 4096
   [    5.512172] [bstn]: bstn_probe 84: bstn_fw_manager_init OK
   [    5.512180] [bstn]: bstn_msg_manager_init 238: ipc_init OK
   [    5.512203] [bstn]: bstn_msg_manager_init 262: req_bufs @ phys:0xb2006000
   [    5.512258] [bstn]: bstn_msg_manager_init 286: bstn_msg_receiver task created 0xffffff800e434380
   [    5.512263] [bstn]: bstn_probe 92: bstn_msg_manager_init OK
   [    5.512273] [bstn]: bstn_probe 100: bstn_sysfile_init OK
   [    5.512344] [bstn]: bstn_probe 108: bstn_misc_init OK, device[bstn0] registered
   [    5.512348] [bstn]: bstn_probe 111: BSTN v2.5.3 probe completed
   [    5.537056] bst_identify_probe
   [    5.537343] vsp-ipc 9c000000.ipc_vsp: assigned reserved memory node vsp@0x9c000000
   [    5.537379] init start = 0x9c200000, initp_size = 0x20660, align size = 0x21000
   [    5.537384] cmdp start = 0x9c221000, cmdp_size = 0x2098a0, align size = 0x20a000
   [    5.537387] slab start = 0x9c500000, end = 0x9c600000, slab_size = 0x100000
   [    5.537390] total_alloc_size = 0x600000
   [    5.538507] c0.base  = (____ptrval____), c1.base  = (____ptrval____), c2.base  = (____ptrval____)
   [    5.560295] enter recv
   [    5.560318] printk: console [netcon0] enabled
   [    5.560321] netconsole: network logging started
   [    5.560934] bstgmaceth 30000000.ethernet: error -ENXIO: IRQ rx_chan4_irq not found
   [    5.561038] bstgmaceth 30000000.ethernet: error -ENXIO: IRQ tx_chan4_irq not found
   [    5.561208] printk: console [netcon0] printing thread started
   [    5.573255] bstgmaceth 30000000.ethernet: User ID: 0x10, Synopsys ID: 0x51
   [    5.573264] bstgmaceth 30000000.ethernet:    DWMAC4/5
   [    5.573270] bstgmaceth 30000000.ethernet: DMA HW capability register supported
   [    5.573273] bstgmaceth 30000000.ethernet: RX Checksum Offload Engine supported
   [    5.573276] bstgmaceth 30000000.ethernet: TX Checksum insertion supported
   [    5.573289] bstgmaceth 30000000.ethernet (unnamed net_device) (uninitialized): device MAC address 6a:78:6a:e9:b1:c2
   [    5.573298] bstgmaceth 30000000.ethernet: Enabled Flow TC (entries=2)
   [    5.574338] bstgmaceth 30100000.ethernet: error -ENXIO: IRQ rx_chan4_irq not found
   [    5.574444] bstgmaceth 30100000.ethernet: error -ENXIO: IRQ tx_chan4_irq not found
   [    5.574803] bstgmaceth 30100000.ethernet: User ID: 0x10, Synopsys ID: 0x51
   [    5.574810] bstgmaceth 30100000.ethernet:    DWMAC4/5
   [    5.574814] bstgmaceth 30100000.ethernet: DMA HW capability register supported
   [    5.574817] bstgmaceth 30100000.ethernet: RX Checksum Offload Engine supported
   [    5.574821] bstgmaceth 30100000.ethernet: TX Checksum insertion supported
   [    5.574830] bstgmaceth 30100000.ethernet (unnamed net_device) (uninitialized): device MAC address 7e:fc:7a:ea:0f:1c
   [    5.574836] bstgmaceth 30100000.ethernet: Enabled Flow TC (entries=2)
   [    6.043844] mdio_bus bstgmac-1: MDIO device at address 7 is missing.
   [    6.044017] bstgmaceth 30100000.ethernet: Cannot register the MDIO bus err -19
   [    6.044022] bstgmaceth 30100000.ethernet: bstgmac_dvr_probe: MDIO bus (id: 1) registration failed
   [    6.044409] a1000_isp isp: isp_probe
   [    6.044415] a1000_isp isp: isp_probe
   [    6.044520] a1000_isp isp: init_isp_channel_devs channel 10 not enabled, skip
   [    6.044525] a1000_isp isp: init_isp_channel_devs channel 11 not enabled, skip
   [    6.044679] deser_notify_bound(),line 1069 channel[3]
   [    6.044687] deser_notify_bound(),line 1069 channel[2]
   [    6.044693] deser_notify_bound(),line 1069 channel[1]
   [    6.044697] deser_notify_bound(),line 1069 channel[0]
   [    6.044709] deser_notify_bound(),line 1069 channel[0]
   [    6.044744] a1000_isp isp: assigned reserved memory node bst_isp@0xa1000000
   [    6.045519] Enter dphy_config
   [    6.045534] dphyTst_setCfg_lanes
   [    6.279753]
   [    6.279753] DPHY_SHUTDOWNZ(40) = 0
   [    6.279756]
   [    6.279756] DPHY lane_speed = 1600
   [    6.279808]
   [    6.279808] reg e5 value is 0x1
   [    6.279814]
   [    6.279814] reg 1ac value is 0x4b
   [    6.279820] nreg e4 value is 0x11
   [    6.279825]
   [    6.279825] reg 8 value is 0x18
   [    6.279827]
   [    6.279827] DPHY_N_LANES(4) = 3(ENABLE RX)
   [    6.279829]
   [    6.279829] force rxmode = 0x3c0030
   [    6.279831] dphyTst_release
   [    6.279832]
   [    6.279832] DPHY_SHUTDOWNZ(40) = 1
   [    6.279834]
   [    6.279834] DPHY_RSTZ(44) = 1
   [    6.345208] dphyTst_release timeout
   [    6.345211]
   [    6.345211] dphy0 enable done.
   [    6.345212] dphyTst_release_1_4lane
   [    6.345214]
   [    6.345214] DPHY_1_RSTZ = 3c003c
   [    6.347220]
   [    6.347220] dphy0 and dphy1 enter stopstate.
   [    6.347222]
   [    6.347222] release force rxmode = 0x3c
   [    6.347224] dphyTst_release_1_4lane finish
   [    6.347238] bst,maxim-deser-hub 2-002a: maxim_hub_s_power() line:986
   [    6.347244] bst,maxim-deser-hub 2-002a: maxim_hub_s_power() line:1007 GMSL2
   [    6.407974] bst,maxim-deser-hub 2-002a: max967XX_replicate_mode() line:509
   [    6.408170] bst,maxim-deser-hub 2-002a: max96712_fsync_config() line:436, tr0
   [    6.408938] bst,maxim-deser-hub 2-002a: INTERNAL TRIGGER MODE
   [    6.409702] bst,maxim-deser-hub 2-002a: trig_info.trigger_tx_gpio[0] = 0
   [    6.416644] bst,maxim-deser-hub 2-002a: modify_serdes_address() 254
   [    6.750420] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 0d
   [    6.811052] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 1d
   [    6.871687] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 2d
   [    6.932321] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 3d
   
   CTRL-A Z for help | 115200 8N1 | NOR | Minicom 2.9 | VT102 | Offline | ttyUSB0
   [    7.166303] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 0, not linked
   [    7.226936] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 1, not linked
   [    7.287571] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 2, not linked
   [    7.348212] bst,maxim-deser-hub 2-002a: is_gmsl2_video_connected() index = 3, not linked
   [    7.456521] bst,maxim-deser-hub 2-002a: Failed to request irq 0
   [    7.456526] bst,maxim-deser-hub 2-002a: maxim_hub_s_power(), line 1034, max96712 s_power success!
   [    7.456540] Enter dphy_config
   [    7.456555] dphyTst_setCfg_lanes
   [    7.689752]
   [    7.689752] DPHY_SHUTDOWNZ(40) = 0
   [    7.689755]
   [    7.689755] DPHY lane_speed = 2400
   [    7.689808]
   [    7.689808] reg e5 value is 0x1
   [    7.689813]
   [    7.689813] reg 1ac value is 0x4b
   [    7.689819] nreg e4 value is 0x11
   [    7.689825]
   [    7.689825] reg 8 value is 0x18
   [    7.689827]
   [    7.689827] DPHY_N_LANES(4) = 1(ENABLE RX)
   [    7.689829]
   [    7.689829] force rxmode = 0x3c0030
   [    7.689831] dphyTst_release
   [    7.689832]
   [    7.689832] DPHY_SHUTDOWNZ(40) = 1
   [    7.689834]
   [    7.689834] DPHY_RSTZ(44) = 1
   [    7.755201] dphyTst_release timeout
   [    7.755203]
   [    7.755203] dphy0 enable done.
   [    7.755204] dphyTst_release_1_4lane
   [    7.755206]
   [    7.755206] DPHY_1_RSTZ = 3c003c
   [    7.803760] dphyTst_release_1_4lane timeout
   [    7.803762]
   [    7.803762] dphy0 and dphy1 enter stopstate.
   [    7.803764]
   [    7.803764] release force rxmode = 0x3c
   [    7.803765] dphyTst_release_1_4lane finish
   [    7.803777] bst,maxim-deser-hub 2-0029: maxim_hub_s_power() line:986
   [    7.803782] bst,maxim-deser-hub 2-0029: maxim_hub_s_power() line:1007 GMSL2
   [    7.853309] bst,maxim-deser-hub 2-0029: max967XX_replicate_mode() line:509
   [    7.853506] bst,maxim-deser-hub 2-0029: max96712_fsync_config() line:436, trig_info->trigger_tx_gpio[0] = 8
   [    7.854272] bst,maxim-deser-hub 2-0029: INTERNAL TRIGGER MODE
   [    7.855036] bst,maxim-deser-hub 2-0029: trig_info.trigger_tx_gpio[0] = 8
   [    7.855231] bst,maxim-deser-hub 2-0029: modify_serdes_address() 254
   [    8.196057] bst,maxim-deser-hub 2-0029: is_gmsl2_video_connected() index = 0, not linked
   [    8.196062] modify_serdes_address() cam_dev [1] is NULL, break
   [    8.196064] modify_serdes_address() cam_dev [2] is NULL, break
   [    8.196066] modify_serdes_address() cam_dev [3] is NULL, break
   [    8.447360] bst,maxim-deser-hub 2-0029: is_gmsl2_video_connected() index = 0, not linked
   [    8.507997] bst,maxim-deser-hub 2-0029: is_gmsl2_video_connected() index = 1, not linked
   [    8.568632] bst,maxim-deser-hub 2-0029: is_gmsl2_video_connected() index = 2, not linked
   [    8.629276] bst,maxim-deser-hub 2-0029: is_gmsl2_video_connected() index = 3, not linked
   [    8.737584] bst,maxim-deser-hub 2-0029: Failed to request irq 0
   [    8.737588] bst,maxim-deser-hub 2-0029: maxim_hub_s_power(), line 1034, max96712 s_power success!
   [    8.737593] ox08b camera_s_power(), line 246
   [    8.737600] cfg_num 0, alg_num 0
   [    8.737607] a1000_isp isp: assigned reserved memory node coreip_pub_cma@0xb2000000
   [    8.738184] vsp vsp@1: assigned reserved memory node coreip_pub_cma@0xb2000000
   [    8.738345] [drm] plane:31 created
   [    8.738352] [drm] plane:33 created
   [    8.738718] [drm] Initialized bst-vsp 1.0.0 20200416 for vsp@1 on minor 0
   [    8.738732] bst_drm_platform_probe exit!
   [    8.738844] bst-gmwarp gmwarp@0: assigned reserved memory node coreip_pub_cma@0xb2000000
   [    8.738932] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-0 as /dev/video30
   [    8.739001] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-1 as /dev/video31
   [    8.739059] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-2 as /dev/video32
   [    8.739130] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-3 as /dev/video33
   [    8.739189] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-4 as /dev/video34
   [    8.739245] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-5 as /dev/video35
   [    8.739316] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-6 as /dev/video36
   [    8.739384] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-7 as /dev/video37
   [    8.739448] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-8 as /dev/video38
   [    8.739512] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-9 as /dev/video39
   [    8.739568] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-10 as /dev/video40
   [    8.739633] bst-gmwarp gmwarp@0: Registered bst_gmwarp_channel-11 as /dev/video41
   [    8.739637] bst-gmwarp gmwarp@0: gmwarp probe ok!
   [    8.754621] bst-encode encoder@0: assigned reserved memory node coreip_pub_cma@0xb2000000
   [    8.754701] bst-encode encoder@0: Registerd bst_encoder-0 as /dev/video50
   [    8.754761] bst-encode encoder@0: Registerd bst_encoder-1 as /dev/video51
   [    8.754817] bst-encode encoder@0: Registerd bst_encoder-2 as /dev/video52
   [    8.754882] bst-encode encoder@0: Registerd bst_encoder-3 as /dev/video53
   [    8.754946] bst-encode encoder@0: Registerd bst_encoder-4 as /dev/video54
   [    8.755003] bst-encode encoder@0: Registerd bst_encoder-5 as /dev/video55
   [    8.755065] bst-encode encoder@0: Registerd bst_encoder-6 as /dev/video56
   [    8.755141] bst-encode encoder@0: Registerd bst_encoder-7 as /dev/video57
   [    8.755190] ALSA device list:
   [    8.755195]   No soundcards found.
   [    8.972528] EXT4-fs (mmcblk0p7): recovery complete
   [    8.972949] EXT4-fs (mmcblk0p7): mounted filesystem with ordered data mode. Quota mode: none.
   [    8.972988] VFS: Mounted root (ext4 filesystem) on device 179:7.
   [    8.973612] devtmpfs: mounted
   [    8.974012] Freeing unused kernel memory: 1856K
   [    8.974282] Run /sbin/init as init process
   [    9.158743] audit: type=1404 audit(9.129:2): enforcing=1 old_enforcing=0 auid=4294967295 ses=4294967295 enabled=1 old-enabled=1 lsm=selinux res=1
   [    9.218475] SELinux:  Permission watch in class filesystem not defined in policy.
   [    9.218507] SELinux:  Permission watch in class file not defined in policy.
   [    9.218509] SELinux:  Permission watch_mount in class file not defined in policy.
   [    9.218512] SELinux:  Permission watch_sb in class file not defined in policy.
   [    9.218515] SELinux:  Permission watch_with_perm in class file not defined in policy.
   [    9.218517] SELinux:  Permission watch_reads in class file not defined in policy.
   [    9.218525] SELinux:  Permission watch in class dir not defined in policy.
   [    9.218528] SELinux:  Permission watch_mount in class dir not defined in policy.
   [    9.218530] SELinux:  Permission watch_sb in class dir not defined in policy.
   [    9.218532] SELinux:  Permission watch_with_perm in class dir not defined in policy.
   [    9.218534] SELinux:  Permission watch_reads in class dir not defined in policy.
   [    9.218545] SELinux:  Permission watch in class lnk_file not defined in policy.
   [    9.218548] SELinux:  Permission watch_mount in class lnk_file not defined in policy.
   [    9.218550] SELinux:  Permission watch_sb in class lnk_file not defined in policy.
   [    9.218553] SELinux:  Permission watch_with_perm in class lnk_file not defined in policy.
   [    9.218555] SELinux:  Permission watch_reads in class lnk_file not defined in policy.
   [    9.218562] SELinux:  Permission watch in class chr_file not defined in policy.
   [    9.218564] SELinux:  Permission watch_mount in class chr_file not defined in policy.
   [    9.218566] SELinux:  Permission watch_sb in class chr_file not defined in policy.
   [    9.218569] SELinux:  Permission watch_with_perm in class chr_file not defined in policy.
   [    9.218571] SELinux:  Permission watch_reads in class chr_file not defined in policy.
   [    9.218578] SELinux:  Permission watch in class blk_file not defined in policy.
   [    9.218580] SELinux:  Permission watch_mount in class blk_file not defined in policy.
   [    9.218582] SELinux:  Permission watch_sb in class blk_file not defined in policy.
   [    9.218584] SELinux:  Permission watch_with_perm in class blk_file not defined in policy.
   [    9.218587] SELinux:  Permission watch_reads in class blk_file not defined in policy.
   [    9.218593] SELinux:  Permission watch in class sock_file not defined in policy.
   [    9.218595] SELinux:  Permission watch_mount in class sock_file not defined in policy.
   [    9.218597] SELinux:  Permission watch_sb in class sock_file not defined in policy.
   [    9.218600] SELinux:  Permission watch_with_perm in class sock_file not defined in policy.
   [    9.218602] SELinux:  Permission watch_reads in class sock_file not defined in policy.
   [    9.218608] SELinux:  Permission watch in class fifo_file not defined in policy.
   [    9.218610] SELinux:  Permission watch_mount in class fifo_file not defined in policy.
   [    9.218613] SELinux:  Permission watch_sb in class fifo_file not defined in policy.
   [    9.218615] SELinux:  Permission watch_with_perm in class fifo_file not defined in policy.
   [    9.218618] SELinux:  Permission watch_reads in class fifo_file not defined in policy.
   [    9.218753] SELinux:  Permission perfmon in class capability2 not defined in policy.
   [    9.218756] SELinux:  Permission bpf in class capability2 not defined in policy.
   [    9.218758] SELinux:  Permission checkpoint_restore in class capability2 not defined in policy.
   [    9.218775] SELinux:  Permission perfmon in class cap2_userns not defined in policy.
   [    9.218778] SELinux:  Permission bpf in class cap2_userns not defined in policy.
   [    9.218780] SELinux:  Permission checkpoint_restore in class cap2_userns not defined in policy.
   [    9.218872] SELinux:  Class mctp_socket not defined in policy.
   [    9.218874] SELinux:  Class perf_event not defined in policy.
   [    9.218875] SELinux:  Class anon_inode not defined in policy.
   [    9.218877] SELinux:  Class io_uring not defined in policy.
   [    9.218879] SELinux:  Class user_namespace not defined in policy.
   [    9.218881] SELinux: the above unknown classes and permissions will be allowed
   [    9.241537] SELinux:  policy capability network_peer_controls=1
   [    9.241551] SELinux:  policy capability open_perms=1
   [    9.241553] SELinux:  policy capability extended_socket_class=1
   [    9.241555] SELinux:  policy capability always_check_network=0
   [    9.241558] SELinux:  policy capability cgroup_seclabel=1
   [    9.241560] SELinux:  policy capability nnp_nosuid_transition=1
   [    9.241562] SELinux:  policy capability genfs_seclabel_symlinks=0
   [    9.241564] SELinux:  policy capability ioctl_skip_cloexec=0
   [    9.337566] audit: type=1403 audit(9.309:3): auid=4294967295 ses=4294967295 lsm=selinux res=1
   [    9.347876] systemd[1]: Successfully loaded SELinux policy in 189.944ms.
   [    9.445456] systemd[1]: System time before build time, advancing clock.
   [    9.642816] systemd[1]: Relabelled /dev, /dev/shm, /run, /sys/fs/cgroup in 48.506ms.
   [    9.692606] systemd[1]: systemd 241-9-gc1f8ff8+ running in system mode. (+PAM +AUDIT +SELINUX -IMA -APPARMOR -SMACK +SYSVINIT -UTMP -LIBCRYPTSETUP -GCRYPT -GNUTLS -ACL -XZ -LZ4 -SECC)
   [    9.692902] systemd[1]: Detected architecture arm64.
   [    9.761188] systemd[1]: Set hostname to <a1000>.
   [    9.765722] systemd[1]: Failed to bump fs.file-max, ignoring: Invalid argument
   [    9.865774] systemd-fstab-generator[142]: Mount point  is not a valid path, ignoring.
   [    9.881793] systemd-fstab-generator[142]: Mount point  is not a valid path, ignoring.
   [    9.882075] systemd-fstab-generator[142]: Mount point  is not a valid path, ignoring.
   [    9.945688] systemd[1]: File /lib/systemd/system/systemd-journald.service:12 configures an IP firewall (IPAddressDeny=any), but the local system does not support BPF/cgroup based fir.
   [    9.945702] systemd[1]: Proceeding WITHOUT firewalling in effect! (This warning is only shown for the first loaded unit using IP firewalling.)
   [    9.993988] systemd[1]: Configuration file /lib/systemd/system/user-startup.service is marked executable. Please remove executable permission bits. Proceeding anyway.
   [   10.015829] systemd[1]: /lib/systemd/system/usb-gadget@.service:14: Unknown lvalue 'After' in section 'Service', ignoring
   [   10.019272] systemd[1]: Configuration file /lib/systemd/system/safety-service.service is marked executable. Please remove executable permission bits. Proceeding anyway.
   [   10.019582] systemd[1]: /lib/systemd/system/safety-service.service:8: Unknown lvalue 'StartLimitIntervalSec' in section 'Service', ignoring
   [   12.379759] random: crng init done
   [   12.475848] early application starting...
   [   12.730278] audit: type=1130 audit(1675679554.279:4): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=selinux-labeldev comm="systemd" exe="/lib/'
   [   12.730364] audit: type=1131 audit(1675679554.279:5): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=selinux-labeldev comm="systemd" exe="/lib/'
   [   12.731973] audit: type=1130 audit(1675679554.279:6): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=kmod-static-nodes comm="systemd" exe="/lib'
   [   12.761921] audit: type=1130 audit(1675679554.309:7): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=systemd-sysctl comm="systemd" exe="/lib/sy'
   [   12.860995] EXT4-fs (mmcblk0p7): re-mounted. Quota mode: none.
   [   12.865560] audit: type=1130 audit(1675679554.409:8): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=systemd-remount-fs comm="systemd" exe="/li'
   [   12.956353] audit: type=1130 audit(1675679554.499:9): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=systemd-tmpfiles-setup-dev comm="systemd" '
   [   13.098380] audit: type=1130 audit(1675679554.639:10): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=systemd-journald comm="systemd" exe="/lib'
   [   13.180022] systemd-journald[173]: Received request to flush runtime journal from PID 1
   [   13.187569] systemd-journald[173]: File /var/log/journal/c9eb360cf45a4d3ca7df8dc9a4b9d632/system.journal corrupted or uncleanly shut down, renaming and replacing.
   [   13.209076] audit: type=1130 audit(1675679554.749:11): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=systemd-udevd comm="systemd" exe="/lib/sy'
   [   13.904594] bst_noc_pmu_probe, 296
   [   13.904685] bst_nocpmu 32702000.noc_pmu: assigned reserved memory node noc_pmu@0xe8000000
   [   13.936242] bst-thermal 70039000.thermal: cooling_dev, name=pwm
   [   14.912819] EXT4-fs (mmcblk0p9): recovery complete
   [   14.912842] EXT4-fs (mmcblk0p9): mounted filesystem with ordered data mode. Quota mode: none.
   [   14.916892] ext4 filesystem being mounted at /secdata supports timestamps until 2038 (0x7fffffff)
   [   14.965123] EXT4-fs (mmcblk0p6): recovery complete
   [   14.965622] EXT4-fs (mmcblk0p6): mounted filesystem with ordered data mode. Quota mode: none.
   [   15.471416] EXT4-fs (mmcblk0p10): recovery complete
   [   15.471609] EXT4-fs (mmcblk0p10): mounted filesystem with ordered data mode. Quota mode: none.
   [   15.583524] kauditd_printk_skb: 2 callbacks suppressed
   [   15.583538] audit: type=1130 audit(1675679557.129:14): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=selinux-autorelabel comm="systemd" exe="/'
   [   15.583841] audit: type=1131 audit(1675679557.129:15): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=selinux-autorelabel comm="systemd" exe="/'
   [   15.640743] audit: type=1130 audit(1675679557.189:16): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=selinux-init comm="systemd" exe="/lib/sys'
   [   15.641029] audit: type=1131 audit(1675679557.189:17): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=selinux-init comm="systemd" exe="/lib/sys'
   [   15.745845] audit: type=1130 audit(1675679557.289:18): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=systemd-tmpfiles-setup comm="systemd" exe'
   [   18.103131] audit: type=1130 audit(1675679559.649:19): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=bstosuser comm="systemd" exe="/lib/system'
   [   18.103678] audit: type=1131 audit(1675679559.649:20): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=bstosuser comm="systemd" exe="/lib/system'
   [   18.193782] audit: type=1130 audit(1675679559.739:21): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=safety-service comm="systemd" exe="/lib/s'
   [   18.197052] audit: type=1130 audit(1675679559.739:22): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=user-startup comm="systemd" exe="/lib/sys'
   [   18.237303] audit: type=1130 audit(1675679559.779:23): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=busybox-syslog comm="systemd" exe="/lib/s'
   [   18.831535] picp: picp init start...
   [   18.831663] picp: pci not init..
   [   18.893208] picp: picp init start...
   [   18.893340] picp: pci not init..
   [   18.934665] picp: picp init start...
   [   18.934806] picp: pci not init..
   [   20.667877] file system registered
   [   20.741400] dwmac4: Master AXI performs fixed burst length
   [   20.741447] bstgmaceth 30000000.ethernet eth0: Safety Features Fix to 0.Hw feature 3
   [   20.741459] bstgmaceth 30000000.ethernet eth0: No Safety Features support found
   [   20.741492] bstgmaceth 30000000.ethernet eth0: IEEE 1588-2008 Advanced Timestamp supported
   [   20.746066] pps pps0: new PPS source ptp0
   [   20.746880] bstgmaceth 30000000.ethernet eth0: registered PTP clock
   [   20.746902] bstgmaceth 30000000.ethernet eth0: configuring for fixed/rgmii link mode
   [   20.756958] bstgmaceth 30000000.ethernet eth0: Link is Up - 1Gbps/Full - flow control off
   [   20.768570] bstgmaceth 30000000.ethernet eth0: Request Tx chan:0 irq:67.
   [   20.768589] bstgmaceth 30000000.ethernet eth0: Request Tx chan:1 irq:68.
   [   20.770788] bstgmaceth 30000000.ethernet eth0: Request Tx chan:2 irq:69.
   [   20.770818] bstgmaceth 30000000.ethernet eth0: Request Tx chan:3 irq:70.
   [   20.776672] bstgmaceth 30000000.ethernet eth0: Request Rx chan:0 irq:63.
   [   20.782635] bstgmaceth 30000000.ethernet eth0: Request Rx chan:1 irq:64.
   [   20.795483] bstgmaceth 30000000.ethernet eth0: Request Rx chan:2 irq:65.
   [   20.801242] bstgmaceth 30000000.ethernet eth0: Request Rx chan:3 irq:66.
   [   20.816356] 8021q: adding VLAN 0 to HW filter on device eth0
   [   20.880677] kauditd_printk_skb: 19 callbacks suppressed
   [   20.880692] audit: type=1130 audit(1675679562.429:43): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=NetworkManager-dispatcher comm="systemd" '
   [   20.913516] EXT4-fs (mmcblk0p5): recovery complete
   [   20.913543] EXT4-fs (mmcblk0p5): mounted filesystem with ordered data mode. Quota mode: none.
   [   21.166231] read descriptors
   [   21.166250] read descriptors
   [   21.166255] read strings
   [   21.303268] bstgmac_ethtool_get_link_ksettings: eth0: PHY is not registered
   [   21.498934] audit: type=1404 audit(1675679563.039:44): enforcing=0 old_enforcing=1 auid=4294967295 ses=4294967295 enabled=1 old-enabled=1 lsm=selinux res=1
   [   21.504209] audit: type=1300 audit(1675679563.039:44): arch=c00000b7 syscall=64 success=yes exit=1 a0=3 a1=7fe032a6d8 a2=1 a3=7fbb55ea78 items=0 ppid=371 pid=633 auid=4294967295 uid=)
   [   21.504921] audit: type=1327 audit(1675679563.039:44): proctitle=736574656E666F7263650030
   [   21.520737] audit: type=1130 audit(1675679563.069:45): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=rc-local comm="systemd" exe="/lib/systemd'
   [   21.574655] audit: type=1130 audit(1675679563.119:46): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=getty@tty1 comm="systemd" exe="/lib/syste'
   [   21.636310] audit: type=1130 audit(1675679563.179:47): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=serial-getty@ttyS0 comm="systemd" exe="/l'
   [   22.202000] audit: type=1130 audit(1675679563.749:48): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=usb-gadget@g1 comm="systemd" exe="/lib/sy'
   [   22.310234] bash (697): /proc/173/oom_adj is deprecated, please use /proc/173/oom_score_adj instead.
   
   BSTOS (Operation System by Black Sesame Technologies) 2.3.0.4 a1000 ttyS0
   
   a1000 login: [   23.484629] audit: type=1130 audit(1675679565.029:49): pid=1 uid=0 auid=4294967295 ses=4294967295 subj=system_u:system_r:init_t:s0 msg='unit=udsservice_autostart comm="s'
   [   23.637773] audit: type=1701 audit(1675679565.179:50): auid=4294967295 uid=0 gid=0 ses=4294967295 subj=system_u:system_r:initrc_t:s0 pid=701 comm="uds_service" exe="/usr/bin/uds_serv1
   ```





## 适配问题总结

- 目前加载guest的方式尚不健全，需要改进

- 遇到的主要问题就是跑飞的问题，在qemu环境下实现时没有遇到，在上板子的时候则出现问题，在胡博的帮助下成功定位

  由于在进入guest时没有无效化guest内核镜像加载区域的数据缓存，在进入guest进行一些数据读写相关的指令时访问的不是正确的数据内容，导致跑飞

  通过在进入前对对应的区域进行缓存无效化后成功解决