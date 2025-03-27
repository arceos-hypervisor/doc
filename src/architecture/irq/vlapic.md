# 虚拟 Local APIC

本节描述了虚拟 Local APIC 的实现。

## 全虚拟化

### 寄存器虚拟化：

Local APIC 的寄存器通过内存映射（MMIO）访问。虚拟机对 APIC 寄存器的读写会触发 VM-exit，由虚拟化层（如 VMM/Hypervisor）模拟这些操作，维护每个虚拟 CPU（vCPU）的虚拟寄存器状态。

### 中断注入：

当物理中断需要传递给虚拟机时，虚拟化层将其转换为虚拟中断（如虚拟 IRQ），并通过修改虚拟 APIC 的状态（如 IRR/ISR 寄存器）或直接注入中断（如 Intel 的 vmcs VM_ENTRY_INTR_INFO）通知虚拟机。

### 定时器虚拟化：

虚拟 APIC 定时器需根据虚拟机的配置（如周期和计数）模拟中断。Hypervisor 可能使用物理定时器（如 host 的 hrtimer）或时间偏移技术来触发虚拟中断。

## 硬件辅助虚拟化

现代 CPU（如 Intel VT-x 和 AMD-V）提供了硬件加速特性，显著优化性能：

### APICv（Intel） / AVIC（AMD）：

硬件直接支持虚拟 APIC 状态维护，减少 VM-exit。例如：

 * Virtual APIC Page：在 VMCS 中维护虚拟 APIC 的寄存器，允许虚拟机直接访问，无需陷入。

 * 中断投递优化：硬件自动将中断路由到目标 vCPU 的虚拟 APIC。

 * 自动处理 EOI：某些中断的确认（EOI）由硬件处理，避免 VM-exit。

### Posted Interrupts（Intel）：

 * 物理中断可直接“投递”到虚拟机的虚拟 APIC，绕过 Hypervisor 干预，极大降低延迟。

## 具体实现

代码位于 [x86-vlapic](https://github.com/arceos-hypervisor/x86_vlapic)

`EmulatedLocalApic` 实现了虚拟中断的基本方法，通过 `handle_read` `handle_write` 实现读写虚拟中断寄存器的功能。

`VirtualApicRegs` 包含了 `APIC` 所有寄存器，保存客户机虚拟中断的寄存器状态

### Local APIC 寄存器

本地APIC寄存器被内存映射到MP/MADT表中可找到的地址。若使用分页，请确保将这些寄存器映射到虚拟内存。每个寄存器均为32位长，并期望以32位整数形式进行读写。尽管每个寄存器占用4个字节，但它们都按16字节边界对齐。
本地APIC寄存器列表（待办事项：为所有寄存器添加描述）：

```rust
register_structs! {
    #[allow(non_snake_case)]
    pub LocalAPICRegs {
        (0x00 => _reserved0),
        /// Local APIC ID register (VID): the 32-bit field located at offset 000H on the virtual-APIC page.
        (0x20 => pub ID: ReadWrite<u32>),
        (0x24 => _reserved1),
        /// Local APIC Version register (VVER): the 32-bit field located at offset 030H on the virtual-APIC page.
        (0x30 => pub VERSION: ReadOnly<u32>),
        (0x34 => _reserved2),
        /// Virtual task-priority register (VTPR): the 32-bit field located at offset 080H on the virtual-APIC page.
        (0x80 => pub TPR: ReadWrite<u32>),
        (0x84 => _reserved3),
        /// Virtual APIC-priority register (VAPR): the 32-bit field located at offset 090H on the virtual-APIC page.
        (0x90 => pub APR: ReadOnly<u32>),
        (0x94 => _reserved4),
        /// Virtual processor-priority register (VPPR): the 32-bit field located at offset 0A0H on the virtual-APIC page.
        (0xA0 => pub PPR: ReadOnly<u32>),
        (0xA4 => _reserved5),
        /// Virtual end-of-interrupt register (VEOI): the 32-bit field located at offset 0B0H on the virtual-APIC page.
        (0xB0 => pub EOI: WriteOnly<u32>),
        (0xB4 => _reserved6),
        /// Virtual Remote Read Register (RRD): the 32-bit field located at offset 0C0H on the virtual-APIC page.
        (0xC0 => pub RRD: ReadOnly<u32>),
        (0xC4 => _reserved7),
        /// Virtual Logical Destination Register (LDR): the 32-bit field located at offset 0D0H on the virtual-APIC page.
        (0xD0 => pub LDR: ReadWrite<u32>),
        (0xD4 => _reserved8),
        /// Virtual Destination Format Register (DFR): the 32-bit field located at offset 0E0H on the virtual-APIC page.
        (0xE0 => pub DFR: ReadWrite<u32>),
        (0xE4 => _reserved9),
        /// Virtual Spurious Interrupt Vector Register (SVR): the 32-bit field located at offset 0F0H on the virtual-APIC page.
        (0xF0 => pub SVR: SpuriousInterruptVectorRegisterMmio),
        (0xF4 => _reserved10),
        /// Virtual interrupt-service register (VISR):
        /// the 256-bit value comprising eight non-contiguous 32-bit fields at offsets
        /// 100H, 110H, 120H, 130H, 140H, 150H, 160H, and 170H on the virtual-APIC page.
        (0x100 => pub ISR: [ReadOnly<u128>; 8]),
        /// Virtual trigger-mode register (VTMR):
        /// the 256-bit value comprising eight non-contiguous 32-bit fields at offsets
        /// 180H, 190H, 1A0H, 1B0H, 1C0H, 1D0H, 1E0H, and 1F0H on the virtual-APIC page.
        (0x180 => pub TMR: [ReadOnly<u128>; 8]),
        /// Virtual interrupt-request register (VIRR):
        /// the 256-bit value comprising eight non-contiguous 32-bit fields at offsets
        /// 200H, 210H, 220H, 230H, 240H, 250H, 260H, and 270H on the virtual-APIC page.
        /// Bit x of the VIRR is at bit position (x & 1FH) at offset (200H | ((x & E0H) » 1)).
        /// The processor uses only the low 4 bytes of each of the 16-Byte fields at offsets 200H, 210H, 220H, 230H, 240H, 250H, 260H, and 270H.
        (0x200 => pub IRR: [ReadOnly<u128>; 8]),
        /// Virtual error-status register (VESR): the 32-bit field located at offset 280H on the virtual-APIC page.
        (0x280 => pub ESR: ReadWrite<u32>),
        (0x284 => _reserved11),
        /// Virtual LVT Corrected Machine Check Interrupt (CMCI) Register
        (0x2F0 => pub LVT_CMCI: LvtCmciRegisterMmio),
        (0x2F4 => _reserved12),
        /// Virtual Interrupt Command Register (ICR): the 64-bit field located at offset 300H on the virtual-APIC page.
        (0x300 => pub ICR_LO: ReadWrite<u32>),
        (0x304 => _reserved13),
        (0x310 => pub ICR_HI: ReadWrite<u32>),
        (0x314 => _reserved14),
        /// Virtual LVT Timer Register: the 32-bit field located at offset 320H on the virtual-APIC page.
        (0x320 => pub LVT_TIMER: LvtTimerRegisterMmio),
        (0x324 => _reserved15),
        /// Virtual LVT Thermal Sensor register: the 32-bit field located at offset 330H on the virtual-APIC page.
        (0x330 => pub LVT_THERMAL: LvtThermalMonitorRegisterMmio),
        (0x334 => _reserved16),
        /// Virtual LVT Performance Monitoring Counters register: the 32-bit field located at offset 340H on the virtual-APIC page.
        (0x340 => pub LVT_PMI: LvtPerformanceCounterRegisterMmio),
        (0x344 => _reserved17),
        /// Virtual LVT LINT0 register: the 32-bit field located at offset 350H on the virtual-APIC page.
        (0x350 => pub LVT_LINT0: LvtLint0RegisterMmio),
        (0x354 => _reserved18),
        /// Virtual LVT LINT1 register: the 32-bit field located at offset 360H on the virtual-APIC page.
        (0x360 => pub LVT_LINT1: LvtLint1RegisterMmio),
        (0x364 => _reserved19),
        /// Virtual LVT Error register: the 32-bit field located at offset 370H on the virtual-APIC page.
        (0x370 => pub LVT_ERROR: LvtErrorRegisterMmio),
        (0x374 => _reserved20),
        /// Virtual Initial Count Register (for Timer): the 32-bit field located at offset 380H on the virtual-APIC page.
        (0x380 => pub ICR_TIMER: ReadWrite<u32>),
        (0x384 => _reserved21),
        /// Virtual Current Count Register (for Timer): the 32-bit field located at offset 390H on the virtual-APIC page.
        (0x390 => pub CCR_TIMER: ReadOnly<u32>),
        (0x394 => _reserved22),
        /// Virtual Divide Configuration Register (for Timer): the 32-bit field located at offset 3E0H on the virtual-APIC page.
        (0x3E0 => pub DCR_TIMER: ReadWrite<u32>),
        (0x3E4 => _reserved23),
        /// Virtual SELF IPI Register: the 32-bit field located at offset 3F0H on the virtual-APIC page.
        (0x3F0 => pub SELF_IPI: WriteOnly<u32>),
        (0x3F4 => _reserved24),
        (0x1000 => @END),
    }
}
```

### EOI 寄存器

使用值0向偏移量为0xB0的寄存器写入，以信号通知中断结束。使用非零值可能会导致通用保护故障。

### Local Vector Table 寄存器

处理器和LAPIC自身可以生成一些特殊的中断。虽然外部中断是在I/O APIC中配置的，但这些中断必须使用LAPIC中的寄存器进行配置。最有趣的寄存器包括：0x320 = LAPIC定时器，0x350 = LINT0，0x360 = LINT1。更多详情请参见 `Intel SDM vol 3`。

寄存器格式：

| 位范围 | 描述 |
| --- | --- |
| 0-7 | 向量编号 |
| 8-10（定时器保留） | 如果是NMI则为100b |
| 11 | 保留 |
| 12 | 如果中断挂起则设置 |
| 13（定时器保留） | 极性，设置为低电平触发 |
| 14（定时器保留） | 远程IRR |
| 15（定时器保留） | 触发模式，设置为电平触发 |
| 16 | 设置以屏蔽 |
| 17-31 | 保留 |

### Spurious Interrupt Vector 寄存器

偏移量是0xF0。低字节包含伪中断的编号。如上所述，您应该将此设置为0xFF。要启用APIC，请设置此寄存器的第8位（或0x100）。如果设置了第12位，则EOI消息不会被广播。其余的所有位目前都是保留的。

### Interrupt Command 寄存器 (ICR)

中断命令寄存器由两个32位寄存器组成；一个位于0x300，另一个位于0x310。它用于向不同的处理器发送中断。中断是在0x300被写入时发出的，而不是在0x310被写入时发出的。因此，要发送中断命令，应该首先写入0x310，然后写入0x300。在0x310处有一个位于位24-27的字段，它是目标处理器的本地APIC ID（针对物理目的地模式）。这里是0x300的结构：

| 位范围       | 描述                                                                 |
| ------------ | -------------------------------------------------------------------- |
| 0-7          | 向量编号，或SIPI的起始页号                                           |
| 8-10         | 交付模式。0表示正常，1表示最低优先级，2表示SMI，4表示NMI，5可以是INIT或INIT级别解除，6表示SIPI |
| 11           | 目的地模式。清除表示物理目的地，或者设置表示逻辑目的地。如果该位被清除，则0x310中的目的地字段被视为正常处理 |
| 12           | 交付状态。当中断被目标接受时清除。通常应在发送中断后等待此位清除                  |
| 13           | 保留                                                                |
| 14           | 清除表示INIT级别解除，否则设置                                       |
| 15           | 设置表示INIT级别解除，否则清除                                       |
| 18-19        | 目的地类型。如果>0，则忽略0x310中的目的地字段。1总是发送中断给自己，2发送给所有处理器，3发送给除当前处理器外的所有处理器。最好避免使用模式1、2和3，并坚持使用0 |
| 20-31        | 保留                                                                |

