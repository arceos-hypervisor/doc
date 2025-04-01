<!-- <div align="center">

<img src="https://arceos-hypervisor.github.io/doc/assets/logo.svg" alt="axvisor-logo" width="64">

</div> -->

<h2 align="center">AxVisor Book</h1>

<p align="center">基于 mdbook 创建的统一模块化虚拟机管理程序 AxVisor 的在线文档</p>

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/arceos-hypervisor/axvisor?logo=github)](https://github.com/arceos-hypervisor/axvisor/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/arceos-hypervisor/axvisor?logo=github)](https://github.com/arceos-hypervisor/axvisor/network)
[![license](https://img.shields.io/github/license/arceos-hypervisor/axvisor)](https://github.com/arceos-hypervisor/axvisor/blob/master/LICENSE)

</div>

[English](README.md) | 中文

# 简介

本仓库是使用 [mdbook](https://rust-lang.github.io/mdBook/) 搭建的统一模块化虚拟机管理程序 AxVisor 的文档的源码仓库。mdbook 是 Rust 官方开发的一个用于创建、维护和部署静态网站的网站生成工具。

## 开发

### 开发环境

默认安装 Rust 后并不会同步安装 mdbook 工具，我们需要使用 `cargo install mdbook mdbook-pagetoc` 手动进行安装及相关插件，mdbook 可执行文件会被放到 `.cargo/bin` 目录中。

### 编写文档

mdbook 是一个将 Markdown 文档作为源文件的文档系统，因此，我们只需要以 Markdown 语法编写源文件即可。

源码中的 `doc/docs/src/SUMMARY.md` 是文档的目录，当新增了源文件之后，需要在其中添加上对应的文件路径

### 构建

mdbook 是一个命令行工具，使用命令 `mdbook build` 就可以自动生成对应的静态网页。使用命令 `mdbook serve` 可以在本地启动一个 HTTP 服务端，然后我们就可以在浏览器 http://localhost:3000 中预览文档。其他参数如下：

```
$ mdbook -h
Creates a book from markdown files

Usage: mdbook [COMMAND]

Commands:
  init         Creates the boilerplate structure and files for a new book
  build        Builds a book from its markdown files
  test         Tests that a book's Rust code samples compile
  clean        Deletes a built book
  completions  Generate shell completions for your shell to stdout
  watch        Watches a book's files and rebuilds it on changes
  serve        Serves a book at http://localhost:3000, and rebuilds it on changes
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version

For more information about a specific command, try `mdbook <command> --help`
The source code for mdBook is available at: https://github.com/rust-lang/mdBook
```

## 部署

目前，AxVisor 的文档网站托管在了 GitHub Pages 上：https://arceos-hypervisor.github.io/doc/，仓库默认配置为通过 GitHub Action 进行部署（Github 本身支持 Actions 和 Branch 两种部署方式），当把源码提交到仓库之后将自动触发 GitHub Action 进行部署。

## 如何贡献

欢迎 FORK 本仓库，然后提交 PR。

## 许可协议

AxVisor Book 使用如下开源协议：

 * Apache-2.0
 * MulanPubL-2.0
 * MulanPSL2
 * GPL-3.0-or-later
