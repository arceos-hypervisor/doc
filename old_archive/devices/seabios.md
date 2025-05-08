# [Seabios](https://github.com/coreboot/seabios/)

考虑使用一个完备的 bios 来代替现在苏佬捏的 vlbl([virtual linux bootloader](https://github.com/arceos-hypervisor/arceos/tree/process_type15/apps/hv/guest/vlbl))

本文记录 AxVisor 引导 seabios 的启动遇到的一些坑

进度：目前 pending，详见 [Status](#status)

## Documentation

* [memory model](https://www.seabios.org/Memory_Model)

* [execution and code flow](https://www.seabios.org/Execution_and_code_flow)

* [linking overview](https://www.seabios.org/Linking_overview)

## bios 内存地址
* 参考 [QEMU 中的 seabios : 地址空间](https://martins3.github.io/qemu/bios-memory.html)
* bios 入口
    * `reset_vector`
    * as mensioned in [execution and code flow](https://www.seabios.org/Execution_and_code_flow)
        * > On emulators, this phase starts when the CPU starts execution in 16bit
mode at 0xFFFF0000:FFF0. 
        * 入口代码
        ```assembly
                ORG 0xfff0 // Power-up Entry Point
                .global reset_vector
        reset_vector:
                ljmpw $SEG_BIOS, $entry_post
        ```
        * 重置后系统状态
            * cs.selector = 0xf000
            * cs.base = 0xffff0000
            * rip = 0xfff0
        * 需要映射两次
            * 0xffff_0000
            * 0x000f_0000
    * 跳转到 `post.c:handle_post()` in 32bit mode
        ```assembly
                ORG 0xe05b
        entry_post:
                cmpl $0, %cs:HaveRunPost                // Check for resume/reboot
                jnz entry_resume
                ENTRY_INTO32 _cfunc32flat_handle_post   // Normal entry point
        ```
## mock QEMU
* 目前 seabios 支持从 Xen 或者 QEMU 上boot，主要的支持代码在 `paravirt.c` 中
* 如果想要在 AxVisor 上启动 seabios，需要将自己伪装为 QEMU
* `paravirt.c`
    * QEMU将 VM的启动引导顺序、ACPI 和 SMBIOS表、SMP 和 NUMA 信息等传递给虚拟机。
    * QEMU 的 Firmware Configuration(fw_cfg) Device 机制是 hypervisor 想要支持 seabios 的运行需要完成的

## Status

目前可以加载 seabios 到 AxVisor 地址空间中并从中引导启动

但是卡在 pio 的处理（包括端口模拟以及后续的 qemu_fw_cfg 都需要一定工作量）

* seabios 代码位置（其实就刚从 `entry_post` (.code16) 正要往 `handle_post` (.code32) 跳转）

```assembly
// src/romlayout.S
transition32:
        // Disable irqs (and clear direction flag)
        cli
        cld

        // Disable nmi
        movl %eax, %ecx
        movl $CMOS_RESET_CODE|NMI_DISABLE_BIT, %eax
        outb %al, $PORT_CMOS_INDEX
        inb $PORT_CMOS_DATA, %al

        // enable a20
        inb $PORT_A20, %al
        orb $A20_ENABLE_BIT, %al
        outb %al, $PORT_A20
        movl %ecx, %eax

// src/hw/rtc.h
#define PORT_CMOS_INDEX        0x0070
#define PORT_CMOS_DATA         0x0071

// src/x86.h
// PORT_A20 bitdefs
#define PORT_A20 0x0092
#define A20_ENABLE_BIT 0x02
```

* AxVisor 的 load_img 相关代码

```Rust
// Seabio size: 0x10000 (65536)
// 0xFFFF_0000 - FFFF FFFF
const SEABIOS_LOAD_START_GPA_OFFSET: GuestPhysAddr = 0x0;
const SEABIOS_LOAD_START_GPA_1: GuestPhysAddr = 0xffff_0000;
const SEABIOS_LOAD_START_GPA_2: GuestPhysAddr = 0x000f_0000;
const SEABIOS_LOAD_SIZE: GuestPhysAddr = 0x10000;
const SEABIOS_ENTRY: GuestPhysAddr = 0xffff_fff0;

pub fn setup_xxx_gpm() {
        load_guest_image(bios_paddr, SEABIOS_LOAD_START_GPA_OFFSET, bios_size);
        // ...
        let guest_memory_regions = [
                // Seabios
                GuestMemoryRegion {
                gpa: SEABIOS_LOAD_START_GPA_2,
                hpa: virt_to_phys(
                        (gpa_as_mut_ptr(SEABIOS_LOAD_START_GPA_OFFSET) as HostVirtAddr).into(),
                )
                .into(),
                size: SEABIOS_LOAD_SIZE,
                flags: MappingFlags::READ | MappingFlags::WRITE | MappingFlags::EXECUTE,
                },
                GuestMemoryRegion {
                gpa: SEABIOS_LOAD_START_GPA_1,
                hpa: virt_to_phys(
                        (gpa_as_mut_ptr(SEABIOS_LOAD_START_GPA_OFFSET) as HostVirtAddr).into(),
                )
                .into(),
                size: SEABIOS_LOAD_SIZE,
                flags: MappingFlags::READ | MappingFlags::WRITE | MappingFlags::EXECUTE,
                },
        // ...
        ];
}
```

## .config

```
#
# Automatically generated file; DO NOT EDIT.
# SeaBIOS Configuration
#

#
# General Features
#
# CONFIG_COREBOOT is not set
CONFIG_QEMU=y
# CONFIG_CSM is not set
CONFIG_QEMU_HARDWARE=y
# CONFIG_XEN is not set
# CONFIG_THREADS is not set
# CONFIG_RELOCATE_INIT is not set
# CONFIG_BOOTMENU is not set
# CONFIG_BOOTORDER is not set
# CONFIG_HOST_BIOS_GEOMETRY is not set
CONFIG_ENTRY_EXTRASTACK=y
# CONFIG_MALLOC_UPPERMEMORY is not set
CONFIG_ROM_SIZE=0

#
# Hardware support
#
# CONFIG_USB is not set
CONFIG_SERIAL=y
CONFIG_SERCON=y
# CONFIG_LPT is not set
# CONFIG_HARDWARE_IRQ is not set
# CONFIG_USE_SMM is not set
# CONFIG_MTRR_INIT is not set
# CONFIG_PMTIMER is not set
# CONFIG_TSC_TIMER is not set

#
# BIOS interfaces
#
# CONFIG_DRIVES is not set
# CONFIG_PCIBIOS is not set
# CONFIG_APMBIOS is not set
# CONFIG_PNPBIOS is not set
CONFIG_OPTIONROMS=y
# CONFIG_PMM is not set
CONFIG_BOOT=y
# CONFIG_KEYBOARD is not set
# CONFIG_MOUSE is not set
# CONFIG_S3_RESUME is not set
# CONFIG_VGAHOOKS is not set
# CONFIG_DISABLE_A20 is not set
# CONFIG_WRITABLE_UPPERMEMORY is not set

#
# BIOS Tables
#
# CONFIG_PIRTABLE is not set
# CONFIG_MPTABLE is not set
# CONFIG_SMBIOS is not set
# CONFIG_ACPI is not set
# CONFIG_FW_ROMFILE_LOAD is not set
# CONFIG_ACPI_PARSE is not set

#
# VGA ROM
#
CONFIG_NO_VGABIOS=y
# CONFIG_VGA_STANDARD_VGA is not set
# CONFIG_VGA_CIRRUS is not set
# CONFIG_VGA_ATI is not set
# CONFIG_VGA_BOCHS is not set
# CONFIG_VGA_GEODEGX2 is not set
# CONFIG_VGA_GEODELX is not set
# CONFIG_DISPLAY_BOCHS is not set
# CONFIG_VGA_RAMFB is not set
# CONFIG_BUILD_VGABIOS is not set
CONFIG_VGA_EXTRA_STACK_SIZE=512

#
# Debugging
#
CONFIG_DEBUG_LEVEL=1
CONFIG_DEBUG_SERIAL=y
CONFIG_DEBUG_SERIAL_PORT=0x3f8
CONFIG_DEBUG_IO=y

```