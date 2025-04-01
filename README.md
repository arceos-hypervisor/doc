<!-- <div align="center">

<img src="https://arceos-hypervisor.github.io/doc/assets/logo.svg" alt="axvisor-logo" width="64">

</div> -->

<h2 align="center">AxVisor Book</h1>

<p align="center">THe online documentation built with mdbook for unified modular hypervisor AxVisor.</p>

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/arceos-hypervisor/axvisor?logo=github)](https://github.com/arceos-hypervisor/axvisor/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/arceos-hypervisor/axvisor?logo=github)](https://github.com/arceos-hypervisor/axvisor/network)
[![license](https://img.shields.io/github/license/arceos-hypervisor/axvisor)](https://github.com/arceos-hypervisor/axvisor/blob/master/LICENSE)

</div>

English | [中文](README_CN.md)

# Introduction

This repository is the source repository for the documentation of AxVisor, built using [mdbook](https://rust-lang.github.io/mdBook/). mdbook is a static site generator tool developed by the Rust team for creating, maintaining, and deploying documentation websites.

## Development

### Environment

By default, Rust does not install the mdbook tool. We need to manually install it and related plugins using `cargo install mdbook mdbook-pagetoc mdbook-embedify`. The mdbook executable will be placed in the `.cargo/bin` directory.

### Source file

mdbook is a documentation system that uses Markdown files as source files. Therefore, we only need to write the source files using Markdown syntax.

The `doc/docs/src/SUMMARY.md` file in the source code is the table of contents for the documentation. When new source files are added, their corresponding file paths need to be added to this file.

### Build

mdbook is a command-line tool. The command `mdbook build` can automatically generate the corresponding static web pages. The command `mdbook serve` starts an HTTP server locally, allowing us to preview the documentation in the browser at http://localhost:3000. Other parameters are as follows

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

## Deploy

Currently, the AxVisor documentation website is hosted on GitHub Pages: https://arceos-hypervisor.github.io/doc/. The repository is configured to deploy via GitHub Actions by default (GitHub supports both Actions and Branch deployment methods). Once the source code is committed to the repository, GitHub Actions will be automatically triggered to deploy the site.

## Contributing

Feel free to fork this repository and submit a PR.

## License

AxVisor Book uses the following open-source license:

 * Apache-2.0
 * MulanPubL-2.0
 * MulanPSL2
 * GPL-3.0-or-later
