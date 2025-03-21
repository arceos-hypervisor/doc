# ArceOS-Hypervisor RK3588 适配

1. 从内核源码编译一个合适的linux镜像文件和dtb文件

2. 设置 `arceos-vmm/configs/vms/linux-rk3588-aarch64.toml`文件下的相关信息，此文件为guest相关配置

   ```toml
   id = 1                    //vm id
   name = "linux"			  //vm 命名
   vm_type = 1				  //vm类型
   phy_cpu_sets = [0x1]      //设定每一个vcpu的亲和性
   cpu_num = 1             //cpu 数量
   entry_point = 0x1008_0000  //guest内核入口地址，约定内核从这个地址开始运行
   kernel_load_addr = 0x1008_0000   //guest内核加载地址，约定将内核加载到这个地址
   dtb_load_addr = 0x1000_0000      //guest dtb加载地址，约定将dtb加载到这个地址
   
   # The location of image: "memory" | "fs"
   # load from memory
   image_location = "memory"       //内核加载方式，rk3588目前为从内存中加载guest镜像
   kernel_path = "linux-rk3588-aarch64.bin" //guest 内核镜像所在的本地路径，推荐使用绝对地址
   dtb_path = "linux-rk3588.dtb"			 //guest dtb文件所在的本地路径，推荐使用绝对地址
   
   # ramdisk_path = ""
   # ramdisk_load_addr = 0
   # disk_path = "disk.img"
   # Memory regions with format (`base_paddr`, `size`, `flags`, `map_type`).
   # For `map_type`, 0 means `MAP_ALLOC`, 1 means `MAP_IDENTICAL`.
   memory_regions = [
       [0x0, 0x10_f000, 0x37, 1],        # rk3588使用到的一段uncached内存，需要一一映射
       [0x940_0000, 0x76c00000, 0x7, 1], # 一一映射给guest的物理内存，根据实际的物理内存按需分配即可
   ]
   
   # Emu_devices
   # Name Base-Ipa Ipa_len Alloc-Irq Emu-Type EmuConfig
   emu_devices = []
   
   # Pass-through devices
   # Name Base-Ipa Base-Pa Length Alloc-Irq
   //此处的设备地址目前主要是根据设备树来的，需要给guest linux什么设备，就同时修改此处的配置和相关的dtb，使二者一致即可
   passthrough_devices = [
       [
           "ramoops",
           0x11_0000,
           0x11_0000,					
           0xf_0000,
           0x1,
       ],
       [
           "sram",
           0x10_f000,
           0x10_f000,
           0x1000,
           0x1,
       ],
       [
           "gpu",
           0xfb00_0000,
           0xfb00_0000,
           0x200000,
           0x1,
       ],
       [
           "uart8250 UART",
           0xfd00_0000,
           0xfd00_0000,
           0x2000000,
           0x1,
       ],
       [
           "usb",
           0xfc00_0000,
           0xfc00_0000,
           0x1000000,
           0x1,
       ],
   ]
   ```

3. 设置`arceos-vmm/configs/platforms/aarch64-rk3588j-hv.toml`文件下的相关信息，此文件为host相关配置

   ```toml
   # Architecture identifier.
   arch = "aarch64" # str                //host 架构
   # Platform identifier.
   platform = "aarch64-rk3588j" # str     //host 平台
   
   #
   # Platform configs
   #
   [plat]
   # Platform family.
   family = "aarch64-rk3588j"
   
   # Base address of the whole physical memory.
   phys-memory-base = 0x20_0000 # uint         //host 物理内存起始地址
   # Size of the whole physical memory.
   phys-memory-size = 0x800_0000    # uint     //host自身管理使用的内存大小，由于目前对非连续物理内存的支持不够完善，此处物理内存的大小可以小于host使用的内存，在guest vm使用一一映射的内存可以不在此段内存中
   # Base physical address of the kernel image.
   kernel-base-paddr = 0x48_0000 # uint         //host内核起始物理地址
   # Base virtual address of the kernel image.
   kernel-base-vaddr = "0x0000_0000_0048_0000"   //host内核起始虚拟地址
   # Linear mapping offset, for quick conversions between physical and virtual
   # addresses.
   phys-virt-offset = "0x0000_0000_0000_0000"
   # Kernel address space base.
   kernel-aspace-base = "0x0000_0000_0000_0000"
   # Kernel address space size.
   kernel-aspace-size = "0x0000_ffff_ffff_f000"
   
   #
   # Device specifications
   #
   [devices]
   # MMIO regions with format (`base_paddr`, `size`).
   //host物理设备的地址
   mmio-regions = [
       [0xfeb50000, 0x1000], # uart8250 UART0
       [0xfe600000, 0x10000], # gic-v3 gicd
       [0xfe680000, 0x100000], # gic-v3 gicr
       [0xa41000000, 0x400000],
       [0xa40c00000, 0x400000],
       [0xf4000000,0x1000000],
       [0xf3000000,0x1000000],
   ] # [(uint, uint)]
   # VirtIO MMIO regions with format (`base_paddr`, `size`).
   virtio-mmio-regions = []  # [(uint, uint)]
   
   # Base physical address of the PCIe ECAM space.
   pci-ecam-base = 0xf4000000  # uint
   # End PCI bus number (`bus-range` property in device tree).
   pci-bus-end = 0xff # uint
   # PCI device memory ranges (`ranges` property in device tree).
   pci-ranges = [] # [(uint, uint)]
   # UART Address
   uart-paddr = 0xfeb5_0000 # uint
   uart-irq = 0x14d # uint
   
   # GICC Address
   gicd-paddr = 0xfe600000 # uint
   # GICR Address
   gicc-paddr = 0xfe680000 # uint
   gicr-paddr = 0xfe680000 # uint
   
   # PSCI
   psci-method = "smc" # str
   
   # pl031@9010000 {
   #     clock-names = "apb_pclk";
   #     clocks = <0x8000>;
   #     interrupts = <0x00 0x02 0x04>;
   #     reg = <0x00 0x9010000 0x00 0x1000>;
   #     compatible = "arm,pl031\0arm,primecell";
   # };
   # RTC (PL031) Address
   rtc-paddr = 0x901_0000          # uint
   ```

4. 使用`make A=(pwd) ARCH=aarch64 VM_CONFIGS=configs/vms/linux-rk3588-aarch64.toml PLAT_NAME=aarch64-rk3588j-hv FEATURES=page-alloc-64g,hv LOG=info kernel` 编译出一个可烧写的arceos-umhv内核镜像`boot.img`文件

5. 使用rk3588官方提供的工具等方式将开发板原先的内核镜像文件替换为`step 4`编译出的文件

6. 断电重启
