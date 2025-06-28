// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><li class="part-title">About AxVisor</li><li class="chapter-item expanded "><a href="overview/overview.html"><strong aria-hidden="true">1.</strong> Overview</a></li><li class="chapter-item expanded "><a href="overview/platform.html"><strong aria-hidden="true">2.</strong> Hardware platform</a></li><li class="chapter-item expanded "><a href="overview/guest.html"><strong aria-hidden="true">3.</strong> Guest OS</a></li><li class="chapter-item expanded affix "><li class="part-title">Quick Start</li><li class="chapter-item expanded "><a href="quickstart/qemu/qemu.html"><strong aria-hidden="true">4.</strong> QEMU</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="quickstart/qemu/qemu_aarch64.html"><strong aria-hidden="true">4.1.</strong> QEMU-aarch64</a></li><li class="chapter-item expanded "><a href="quickstart/qemu/qemu_x86_64.html"><strong aria-hidden="true">4.2.</strong> QEMU-x86_64</a></li><li class="chapter-item expanded "><a href="quickstart/qemu/qemu_riscv64.html"><strong aria-hidden="true">4.3.</strong> QEMU-riscv64</a></li></ol></li><li class="chapter-item expanded "><a href="quickstart/aarch64/aarch64.html"><strong aria-hidden="true">5.</strong> AArch64</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="quickstart/aarch64/aarch64_a1000.html"><strong aria-hidden="true">5.1.</strong> Huashan A1000</a></li><li class="chapter-item expanded "><a href="quickstart/aarch64/aarch64_rk3588.html"><strong aria-hidden="true">5.2.</strong> RK3588</a></li><li class="chapter-item expanded "><a href="quickstart/aarch64/aarch64_roc-rk3568-pc.html"><strong aria-hidden="true">5.3.</strong> ROC-RK3568-PC</a></li></ol></li><li class="chapter-item expanded "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Architecture Design Manual</li><li class="chapter-item expanded "><a href="architecture/arch.html"><strong aria-hidden="true">6.</strong> Overall Design</a></li><li class="chapter-item expanded "><a href="architecture/axvisor.html"><strong aria-hidden="true">7.</strong> AxVisor</a></li><li class="chapter-item expanded "><a href="architecture/axvisor_api/comparison.html"><strong aria-hidden="true">8.</strong> AxVisor API</a></li><li class="chapter-item expanded "><a href="architecture/axvm.html"><strong aria-hidden="true">9.</strong> axvm</a></li><li class="chapter-item expanded "><a href="architecture/vcpu/vcpu.html"><strong aria-hidden="true">10.</strong> axvcpu</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="architecture/vcpu/x86_vcpu.html"><strong aria-hidden="true">10.1.</strong> x86_vcpu</a></li><li class="chapter-item expanded "><a href="architecture/vcpu/arm_vcpu.html"><strong aria-hidden="true">10.2.</strong> arm_vcpu</a></li><li class="chapter-item expanded "><a href="architecture/vcpu/riscv_vcpu.html"><strong aria-hidden="true">10.3.</strong> riscv_vcpu</a></li><li class="chapter-item expanded "><a href="architecture/vcpu/loongarch_vcpu.html"><strong aria-hidden="true">10.4.</strong> loongarch_vcpu</a></li></ol></li><li class="chapter-item expanded "><a href="architecture/memory.html"><strong aria-hidden="true">11.</strong> axaddrspace</a></li><li class="chapter-item expanded "><a href="architecture/irq/irq.html"><strong aria-hidden="true">12.</strong> Virtual IRQ</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="architecture/irq/vgic.html"><strong aria-hidden="true">12.1.</strong> vGIC</a></li><li class="chapter-item expanded "><a href="architecture/irq/vlapic.html"><strong aria-hidden="true">12.2.</strong> vLapic</a></li></ol></li><li class="chapter-item expanded "><a href="architecture/device/passthrough_device.html"><strong aria-hidden="true">13.</strong> Passthrough Device</a></li><li class="chapter-item expanded "><a href="architecture/device/device.html"><strong aria-hidden="true">14.</strong> Emulated Device</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="architecture/device/pci.html"><strong aria-hidden="true">14.1.</strong> emulated PCI</a></li><li class="chapter-item expanded "><a href="architecture/device/virtio.html"><strong aria-hidden="true">14.2.</strong> virtio device</a></li></ol></li><li class="chapter-item expanded "><a href="architecture/multi_layer_VM-Exit.html"><strong aria-hidden="true">15.</strong> VM-Exit</a></li><li class="chapter-item expanded "><a href="architecture/test/test.html"><strong aria-hidden="true">16.</strong> Testing</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Development Guide</li><li class="chapter-item expanded "><a href="development/build.html"><strong aria-hidden="true">17.</strong> Build</a></li><li class="chapter-item expanded "><a href="development/platform_port/platform_port.html"><strong aria-hidden="true">18.</strong> Hardware adaptation</a></li><li class="chapter-item expanded "><a href="development/guest_vms/guest_vms.html"><strong aria-hidden="true">19.</strong> Guest adaptation</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="development/guest_vms/2vm_timer.html"><strong aria-hidden="true">19.1.</strong> 2 VM Timer Nimbos</a></li></ol></li><li class="chapter-item expanded "><a href="development/project/project.html"><strong aria-hidden="true">20.</strong> 开发管理</a></li><li class="chapter-item expanded "><a href="development/docs/docs.html"><strong aria-hidden="true">21.</strong> 文档编写</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="development/docs/i18n.html"><strong aria-hidden="true">21.1.</strong> Internationalization</a></li></ol></li><li class="chapter-item expanded "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">调试记录</li><li class="chapter-item expanded "><a href="debug/debug.html"><strong aria-hidden="true">22.</strong> 待添加</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Development Plans</li><li class="chapter-item expanded "><a href="roadmap/roadmap.html"><strong aria-hidden="true">23.</strong> Roadmap</a></li><li class="chapter-item expanded "><a href="roadmap/discusstions.html"><strong aria-hidden="true">24.</strong> Discussions</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
