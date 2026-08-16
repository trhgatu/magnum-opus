# Changelog

## [1.0.0](https://github.com/trhgatu/magnum-opus/compare/v0.1.0...v1.0.0) (2026-08-16)

### Tính năng mới

* **client:** close journal resilience gaps ([d5ecc43](https://github.com/trhgatu/magnum-opus/commit/d5ecc43ac46312a82324bb409f9977e6b1dcbfa3))
* **client:** establish Magnum Opus design system ([9f3c7f5](https://github.com/trhgatu/magnum-opus/commit/9f3c7f55d9715b49a305a094823aef7b7a592308))
* **client:** harden journal editor recovery ([4a75470](https://github.com/trhgatu/magnum-opus/commit/4a75470db33b219f732bf3d21c7c35d71abb16ca))
* **client:** refine journal library experience ([c6758ea](https://github.com/trhgatu/magnum-opus/commit/c6758ea8167bb56d04f27a5593a1c2ea23ef85a7))
* **journal:** complete end-to-end vertical slice ([c669b41](https://github.com/trhgatu/magnum-opus/commit/c669b4141f1d7ebecdf99e96be8101d28d52765e))
* **journal:** establish domain and persistence foundation ([2b66b20](https://github.com/trhgatu/magnum-opus/commit/2b66b20192fa818300ae488e295042fea64f9320))
* **reflection:** add memory backend v1 ([b68bd43](https://github.com/trhgatu/magnum-opus/commit/b68bd43033f7c08529462fb9bba6d36a9197354e))
* **reflection:** add mood vertical slice ([b5c7911](https://github.com/trhgatu/magnum-opus/commit/b5c79114e14e71ada6491224aaae040eb8464f08))
* **reflection:** complete memory v1 experience ([acfcf78](https://github.com/trhgatu/magnum-opus/commit/acfcf783cef99c8b91d677bc1a62200ec78de258))

### Sửa lỗi

* **ci:** patch nanoid and stabilize memory tests ([ffb8150](https://github.com/trhgatu/magnum-opus/commit/ffb815080eb26d6ca634070b29a9d09713eeaccc))
* **client:** refine product voice ([00b869f](https://github.com/trhgatu/magnum-opus/commit/00b869fb122e69c290c141174fdb2e4791da7519))
* **client:** restore JavaScript performance budget ([dd31b02](https://github.com/trhgatu/magnum-opus/commit/dd31b029c7200548cd0a3b7878f20569672a268f))
* **deps:** enforce a single React runtime ([b08d45e](https://github.com/trhgatu/magnum-opus/commit/b08d45e5b29e4413756b5547ae8ebf5750877ae7))
* **deps:** patch nanoid security advisory ([1bf7341](https://github.com/trhgatu/magnum-opus/commit/1bf7341e09619483026eecb08b677858eba891bc))
* patch transitive dependency vulnerabilities ([d610db5](https://github.com/trhgatu/magnum-opus/commit/d610db5472a69b01d3271a1a39c135a157885a72))
* **reflection:** harden v1 release boundaries ([fc37436](https://github.com/trhgatu/magnum-opus/commit/fc374364e71af3a081e13eb12b63e6a0d64ae543))

### Tái cấu trúc

* **auth:** isolate framework adapters ([180fd20](https://github.com/trhgatu/magnum-opus/commit/180fd203918be00d89dc62ca9eb6a898ebcce1a9))
* **client:** isolate journal editor state ([3ebf4b8](https://github.com/trhgatu/magnum-opus/commit/3ebf4b85653729f001490f9d7ede75839af737bb))
* **notifications:** harden realtime delivery boundary ([2b5335c](https://github.com/trhgatu/magnum-opus/commit/2b5335c8a9672b8f674e7cfe93fbbef68971959f))
* **worker:** isolate queue and mail adapters ([443e980](https://github.com/trhgatu/magnum-opus/commit/443e9803ac6097dd493fee9b1c8137fc8db1dab3))

### Tài liệu

* add Magnum Opus engineering handbook ([b9a6769](https://github.com/trhgatu/magnum-opus/commit/b9a6769dec3b2d632c9b5ed722de1397965a3db4))
* define Forge OS migration direction ([c77ce9d](https://github.com/trhgatu/magnum-opus/commit/c77ce9d0bb87c102d9b6ff43b12309639621348e))
* **reflection:** close memory v1 documentation ([ed9d86d](https://github.com/trhgatu/magnum-opus/commit/ed9d86dc03cd13854dd780db5514fe334de76a50))

## Trước V1

Magnum Opus bắt đầu lịch sử phiên bản độc lập ở `0.1.0` khi tách khỏi nền tảng starter. Lịch sử phát hành của starter không thuộc lịch sử sản phẩm Magnum Opus.
