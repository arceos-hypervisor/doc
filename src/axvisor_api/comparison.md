# Axvisor API：设计的思考与妥协

## 1. 为什么需要 Axvisor API？

在 Axvisor 的整体架构中，ArceOS 处于最底层，负责提供内存管理、任务调度、设备驱动、同步原语等多种基础功能；这些功能会被 Axvisor 的各个组件所使用。然而，从软件工程的角度上，我们不能让 Axvisor 的各个组件直接依赖于 ArceOS （的 `axstd` 等接口组件）；这一方面是因为我们希望 ArceOS 与 Axvisor 之间的耦合度尽可能的低，这样可以提高系统的可移植性、可扩展性和可维护性，另一方面则是因为，将对 ArceOS 的依赖分散在各个组件中，会使得依赖和 feature 管理变得极度混乱，容易出现各种错误。

因此，我们需要一个统一的接口，收拢对 ArceOS 的依赖，同时提供给 Axvisor 的各个组件使用。在这里也存在着两个选择，第一是这个接口层放置在所有组件的下层，ArceOS 则被接口层直接依赖，位于最底层；第二是这个接口层同样放置在所有组件的下层，但是 ArceOS 与接口层之间并不直接依赖，接口层只提供接口的定义，实现则由最上层的 app 层来完成。显然，第二种方案在耦合度和可移植性上更有优势，因此我们选择了第二种方案。

## 2. Axvisor API 应该如何实现

如何实现这样的定义与实现分离的接口呢？我们有很多可行的方案。

第一种，也是目前所广泛使用的方案，是在下层定义一个 trait，上层实现这个 trait，在需要使用这个 trait 的地方，通过泛型参数来传递这个 trait。例如：

```rust
// 下层定义
trait MemoryHal {
    fn alloc() -> u64;
    fn dealloc(addr: u64);
    fn phys_to_virt(phys: u64) -> u64;
    fn virt_to_phys(virt: u64) -> u64;
}

// 中层使用
struct AxVCpu<M: MemoryHal> {
    // ...
}

impl<M: MemoryHal> AxVCpu<M> {
    fn some_func(&self) {
        let addr = M::alloc();
        // ...
        M::dealloc(addr);
    }
}

// 上层实现
struct MemoryHalImpl;

impl MemoryHal for MemoryHalImpl {
    fn alloc() -> u64 {
        // ...
    }

    fn dealloc(addr: u64) {
        // ...
    }

    fn phys_to_virt(phys: u64) -> u64 {
        // ...
    }

    fn virt_to_phys(virt: u64) -> u64 {
        // ...
    }
}
```

这种方案的优点是简单易懂，并且编译器有着非常充分的信息，可以进行很好的优化；实现时也可以很清楚的知道哪些接口是必须实现的。然而，这种方案也有着明显的缺点，那就是，具体的实现必须通过泛型参数一层一层地传递下去，一旦某一个较为下层的组件需要使用一个接口，那么这个接口就必须在所有的中间层都写一遍，这会使得代码的可读性和可维护性变得较差。

另一种方案则是贾越凯学长所实现的 `crate_interface` 方案。这个方案在链接时通过符号将接口的定义和实现连接起来，通过特殊定义的数个宏，消除了对泛型参数的依赖。


```rust
// 下层定义
#[def_interface]
trait MemoryHal {
    fn alloc() -> u64;
    fn dealloc(addr: u64);
    fn phys_to_virt(phys: u64) -> u64;
    fn virt_to_phys(virt: u64) -> u64;
}

// 中层使用
struct AxVCpu {
    // ...
}

impl AxVCpu {
    fn some_func(&self) {
        let addr = call_interface!(MemoryHal::alloc);
        // ...
        call_interface!(MemoryHal::dealloc, addr);
    }
}

// 上层实现
struct MemoryHalImpl;

#[impl_interface]
impl MemoryHal for MemoryHalImpl {
    fn alloc() -> u64 {
        // ...
    }

    fn dealloc(addr: u64) {
        // ...
    }

    fn phys_to_virt(phys: u64) -> u64 {
        // ...
    }

    fn virt_to_phys(virt: u64) -> u64 {
        // ...
    }
}
```

相比于通过泛型参数进行依赖注入的方案，`crate_interface` 方案的优点在于无需写出泛型参数，代码更加简洁；同时保留了 trait 的定义，能够明确地知道哪些接口是必须实现的。这个方案的缺点在于，调用接口时需要通过宏，这会使得代码的可读性变差；同时，由于接口的实现是通过符号链接的，因此在编译时会有一些限制，例如无法在一个 crate 中同时实现两个相同的接口，不过考虑到我们的需求（调用 ArceOS 的系统功能），这个限制并不会对我们造成太大的困扰。

## 3. Axvisor API 的设计与妥协

目前 `axvisor_api` crate 中使用了一种改良的定义接口的方式，即使用 `mod` 组织 API，使用标注在 `mod` 上的 `#[api_mod]` 和 `#[api_mod_impl]` 宏来定义和实现接口。示例如下：

```rust
// 下层定义
#[api_mod]
mod memory {
    type PhysAddr = u64;
    type VirtAddr = u64;

    extern fn alloc() -> VirtAddr;
    extern fn dealloc(addr: VirtAddr);
    extern fn phys_to_virt(phys: PhysAddr) -> VirtAddr;
    extern fn virt_to_phys(virt: VirtAddr) -> PhysAddr;

    fn alloc_2_pages() -> (VirtAddr, VirtAddr) {
        let addr = alloc();
        let addr2 = alloc();
        (addr, addr2)
    }
}

// 中层使用
struct AxVCpu {
    // ...
}

impl AxVCpu {
    fn some_func(&self) {
        let addr = memory::alloc();
        // ...
        memory::dealloc(addr);
    }
}

// 上层实现
#[api_mod_impl(path::to::memory)]
mod memory_impl {
    extern fn alloc() -> memory::VirtAddr {
        // ...
    }

    extern fn dealloc(addr: memory::VirtAddr) {
        // ...
    }

    extern fn phys_to_virt(phys: memory::PhysAddr) -> memory::VirtAddr {
        // ...
    }

    extern fn virt_to_phys(virt: memory::VirtAddr) -> memory::PhysAddr {
        // ...
    }
}
```

这种实现方式的优点在于：

1. 组织更加接近于普通的 Rust 模块组织，易于理解；调用接口也使用普通的函数调用语法，对调用者心智负担较小；
2. 接口模块中可以定义一些辅助和工具内容，方便实用，例如 API 相关的类型别名，基于 API 的简单封装等；

但是这种实现方式也有一些缺点：

1. 不容易一次性看出有哪些接口是必须实现的；

  实际上，这两个宏背后使用了 `crate_interface` crate 作为底层实现；虽然技术上可以绕过 `crate_interface`，只使用 `link_name` 来实现接口，但这样就会完全失去使用 trait 来约束必须实现的接口的优势。而现在虽然使用了 trait，但是视觉上仍然不容易看出哪些接口是必须实现的；针对这一点，`api_mod` 宏现在会自动在文档中生成一个列表，列出所有的接口，方便查看。

2. 在 `#[api_mod]` 标注的 `mod` 中，允许所有能够出现在普通 `mod` 中的内容，包括 `struct`、`enum`、`const` 等，这样可能会使得接口模块变得过于臃肿，不易维护；

  这一点可以通过约定来解决，例如只在接口模块中定义接口相关的内容，其他内容放在其他模块中。

目前，经过与贾越凯、胡柯洋等同学的讨论，我们认为可以先在使用现有泛型参数传递方式极为不便的情况下，使用 `axvisor_api` crate 来实现 API，以评估其实际表现和可用性；如果在实际使用中发现了问题，再考虑是否需要进一步改进。
