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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="Introduction.html">Introduction</a></li><li class="chapter-item expanded affix "><li class="part-title">About AxVisor</li><li class="chapter-item expanded "><a href="platform.html"><strong aria-hidden="true">1.</strong> Arch &amp; Platform</a></li><li class="chapter-item expanded "><a href="start/index_cn.html"><strong aria-hidden="true">2.</strong> Quick Start</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="start/How-to.html"><strong aria-hidden="true">2.1.</strong> How-to</a></li><li class="chapter-item expanded "><a href="start/linux_cn.html"><strong aria-hidden="true">2.2.</strong> Guest Linux</a></li><li class="chapter-item expanded "><a href="start/2vm_arceos_linux.html"><strong aria-hidden="true">2.3.</strong> 2 Guest ArceOS + Linux</a></li><li class="chapter-item expanded "><a href="start/2vm_timer_cn.html"><strong aria-hidden="true">2.4.</strong> 2 VM Timer Nimbos</a></li></ol></li><li class="chapter-item expanded "><li class="part-title">Overall Architecture</li><li class="chapter-item expanded "><a href="arch_cn.html"><strong aria-hidden="true">3.</strong> AxVisor 设计文档</a></li><li class="chapter-item expanded "><a href="arch_en.html"><strong aria-hidden="true">4.</strong> AxVisor Overall Arch</a></li><li class="chapter-item expanded "><a href="gvm.html"><strong aria-hidden="true">5.</strong> Supported Guest VMs</a></li><li class="chapter-item expanded affix "><li class="part-title">Components</li><li class="chapter-item expanded "><a href="axvisor.html"><strong aria-hidden="true">6.</strong> axvisor</a></li><li class="chapter-item expanded "><a href="axvm.html"><strong aria-hidden="true">7.</strong> axvm</a></li><li class="chapter-item expanded "><a href="vcpu/vcpu.html"><strong aria-hidden="true">8.</strong> axvcpu</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="vcpu/x86_vcpu.html"><strong aria-hidden="true">8.1.</strong> x86_vcpu</a></li><li class="chapter-item expanded "><a href="vcpu/arm_vcpu.html"><strong aria-hidden="true">8.2.</strong> arm_vcpu</a></li><li class="chapter-item expanded "><a href="vcpu/riscv_vcpu.html"><strong aria-hidden="true">8.3.</strong> riscv_vcpu</a></li><li class="chapter-item expanded "><a href="vcpu/loongarch_vcpu.html"><strong aria-hidden="true">8.4.</strong> loongarch_vcpu</a></li></ol></li><li class="chapter-item expanded "><a href="memory.html"><strong aria-hidden="true">9.</strong> axaddrspace</a></li><li class="chapter-item expanded "><a href="irq/irq.html"><strong aria-hidden="true">10.</strong> Virtual IRQ</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="irq/vgic.html"><strong aria-hidden="true">10.1.</strong> vGIC</a></li><li class="chapter-item expanded "><a href="irq/vlapic.html"><strong aria-hidden="true">10.2.</strong> vLapic</a></li></ol></li><li class="chapter-item expanded "><a href="device/passthrough_device.html"><strong aria-hidden="true">11.</strong> Passthrough Device</a></li><li class="chapter-item expanded "><a href="device/device.html"><strong aria-hidden="true">12.</strong> Emulated Device</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="device/pci.html"><strong aria-hidden="true">12.1.</strong> emulated PCI</a></li><li class="chapter-item expanded "><a href="device/virtio.html"><strong aria-hidden="true">12.2.</strong> virtio device</a></li></ol></li><li class="chapter-item expanded "><a href="designs/multi_layer_VM-Exit.html"><strong aria-hidden="true">13.</strong> VM-Exit</a></li><li class="chapter-item expanded affix "><li class="part-title">Discussions</li><li class="chapter-item expanded "><a href="discusstions.html"><strong aria-hidden="true">14.</strong> Discusstions</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0];
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
