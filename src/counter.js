// 访问计数器（Durable Object 单例，原子自增，不会因并发丢数据）
// 同一个 ID 全局只有一个实例，所有请求串行处理 → 计数准确。
export class VisitCounter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    let count = (await this.state.storage.get("count")) || 0;

    if (url.pathname === "/increment" && request.method === "POST") {
      count += 1;
      await this.state.storage.put("count", count);
    }

    return new Response(JSON.stringify({ count }), {
      headers: {
        "content-type": "application/json;charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  }
}
