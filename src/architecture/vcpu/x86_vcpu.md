* [x86_64](https://github.com/arceos-hypervisor/x86_vcpu)

# x86_vcpu

## 介绍

定义 x86_64 架构的 vCPU 结构和虚拟化相关接口支持。

crate 用户必须使用 [`crate_interface::impl_interface`](https://crates.io/crates/crate_interface) 实现 `PhysFrameIf` trait，以提供 `PhysFrame` 分配和释放的低级实现，相关实现可参考 [ArceOS](https://github.com/arceos-org/arceos/blob/main/modules/axhal/src/paging.rs)。

## Example

``` 
use x86_vcpu::PhysFrameIf;

struct PhysFrameIfImpl;

#[crate_interface::impl_interface]
impl axvm::PhysFrameIf for PhysFrameIfImpl {
    fn alloc_frame() -> Option<PhysAddr> {
        // Your implementation here
    }
    fn dealloc_frame(paddr: PhysAddr) {
        // Your implementation here
    }
    fn phys_to_virt(paddr: PhysAddr) -> VirtAddr {
        // Your implementation here
    }
}
```

##  系统架构

### 模块组织

```
x86_vcpu/
    ├── src/
    │   ├── msr.rs          - 模型特定寄存器操作
    │   ├── regs.rs         - 通用寄存器管理
    │   ├── ept.rs          - 扩展页表支持
    │   ├── frame.rs        - 物理内存帧管理
    │   ├── vmx/            - Intel VT-x 相关实现
    │   │   ├── definitions.rs  - 常量和类型定义
    │   │   ├── instructions.rs - VMX 指令封装
    │   │   ├── percpu.rs       - 每 CPU 状态管理
    │   │   ├── structs.rs      - VMX 数据结构
    │   │   ├── vcpu.rs         - 虚拟 CPU 实现
    │   │   ├── vmcs.rs         - VMCS 字段操作
    │   │   └── mod.rs          - 模块入口
    │   └── lib.rs          - 库入口点
```

### 核心组件

+ `VmxVcpu`: 虚拟 CPU 实现，管理客户机状态和执行
+ `VmxPerCpuState`: 每物理 CPU 的 VMX 状态
+ `VMCS` 管理: 虚拟机控制结构字段的读写操作
+ `EPT` 控制: 扩展页表配置和违规处理
+ 物理内存管理: 通过 PhysFrame 抽象管理物理内存

## 关键数据结构

### `GeneralRegisters`
用于存储和操作 X86_64 通用寄存器状态：

``` rust
#[repr(C)]
pub struct GeneralRegisters {
    pub rax: u64,
    pub rcx: u64,
    // ... 其他寄存器
}
```

提供按索引访问和修改寄存器值的方法：

+ `get_reg_of_index(index: u8) -> u64`
+ `set_reg_of_index(index: u8, value: u64)`

### `VmxVcpu`
虚拟 CPU 的核心实现：

``` 
pub struct VmxVcpu<H: AxVCpuHal> {
    guest_regs: GeneralRegisters,
    host_stack_top: u64,
    launched: bool,
    vmcs: VmxRegion<H>,
    io_bitmap: IOBitmap<H>,
    msr_bitmap: MsrBitmap<H>,
    // ... 其他字段
}
```

### `GuestPageWalkInfo`
存储客户机页表遍历所需的信息：

```
pub struct GuestPageWalkInfo {
    pub top_entry: usize,
    pub level: usize,
    pub width: u32,
    // ... 权限和控制位
}
```

### `PhysFrame`
物理内存页面的安全抽象：

```
pub struct PhysFrame<H: AxVCpuHal> {
    start_paddr: Option<HostPhysAddr>,
    _marker: PhantomData<H>,
}
```

## 核心功能实现
### VCPU 生命周期管理

```
// 创建新的虚拟 CPU
pub fn new() -> AxResult<Self> { ... }

// 配置虚拟 CPU
pub fn setup(&mut self, ept_root: HostPhysAddr, entry: GuestPhysAddr) -> AxResult { ... }

// 绑定到当前物理 CPU
pub fn bind_to_current_processor(&self) -> AxResult { ... }

// 执行客户机代码
pub fn inner_run(&mut self) -> Option<VmxExitInfo> { ... }
```

### VMCS 设置

```
fn setup_vmcs_guest(&mut self, entry: GuestPhysAddr) -> AxResult { ... }

fn setup_vmcs_host(&self) -> AxResult { ... }

fn setup_vmcs_control(&mut self, ept_root: HostPhysAddr, is_guest: bool) -> AxResult { ... }
```

### VM 进入/退出处理

```
#[naked]
unsafe extern "C" fn vmx_launch(&mut self) -> usize { ... }

#[naked]
unsafe extern "C" fn vmx_resume(&mut self) -> usize { ... }

fn builtin_vmexit_handler(&mut self, exit_info: &VmxExitInfo) -> Option<AxResult> { ... }
```

### 事件注入

```
/// Add a virtual interrupt or exception to the pending events list,
/// and try to inject it before later VM entries.
pub fn queue_event(&mut self, vector: u8, err_code: Option<u32>) { ... }

/// Try to inject a pending event before next VM entry.
fn inject_pending_events(&mut self) -> AxResult { ... }
```

### I/O 和 MSR 拦截

```
/// Set I/O intercept by modifying I/O bitmap.
pub fn set_io_intercept_of_range(&mut self, port_base: u32, count: u32, intercept: bool) { ... }

/// Set msr intercept by modifying msr bitmap.
pub fn set_msr_intercept_of_range(&mut self, msr: u32, intercept: bool) { ... }
```

## 关键技术
### VMX 操作模式
实现了完整的 VMX 操作模式切换：

+ 通过 `VMXON` 指令进入 VMX 操作模式
+ 通过 `VMLAUNCH` 和 `VMRESUME` 指令执行客户机代码
+ 通过 VM 退出处理程序响应客户机事件

### 嵌套分页 (EPT)
使用扩展页表实现高效内存虚拟化：

+ 配置 EPT 指针 (EPTP)
+ 处理 EPT 违规事件
+ 支持内存访问权限控制

### 寄存器状态切换

通过X86汇编代码实现状态切换：

+ `save_regs_to_stack!` 宏保存寄存器状态到堆栈
+ `restore_regs_from_stack!` 宏从堆栈恢复寄存器状态
+ 特殊处理栈指针 (RSP) 以确保正确的状态切换

### 指令模拟

为特定指令提供模拟实现：

+ CPUID 指令模拟，提供自定义处理器信息
+ XSETBV 指令处理，管理扩展状态
+ CR 寄存器访问处理

## 内存管理

### 物理内存分配

通过 PhysFrame 抽象提供安全的物理内存管理：

+ 自动释放不再使用的物理页面
+ 支持零填充和自定义初始化
+ 提供物理地址到虚拟地址的转换

### EPT 页表管理

实现二级地址转换机制：

+ 创建和管理 EPT 页表结构
+ 支持不同的页面粒度 (4KB, 2MB, 1GB)
+ 处理页面权限和访问控制

