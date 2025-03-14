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

## 代码分析

代码位于 [x86-vlapic](https://github.com/arceos-hypervisor/x86_vlapic)

`EmulatedLocalApic` 实现了虚拟中断的基本方法，通过 `handle_read` `handle_write` 实现读写虚拟中断寄存器的功能。

`VirtualApicRegs` 包含了 `APIC` 所有寄存器，保存客户机虚拟中断的寄存器状态
