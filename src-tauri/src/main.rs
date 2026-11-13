/**
 * 桌面端入口
 *
 * 前端只负责拼请求参数，真正的网络请求在这里用 reqwest 发出。
 * 好处：不受浏览器 CORS 限制，能自由设置请求头、超时、证书策略。
 */

// 打包后不额外弹一个控制台窗口（只在 Windows 上生效）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// 前端传过来的请求描述，字段名和前端保持一致（camelCase）
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RequestPayload {
    method: String,
    url: String,
    headers: Vec<HeaderRow>,
    /// 没有请求体时是 None
    body: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HeaderRow {
    key: String,
    value: String,
    enabled: bool,
}

/// 返回给前端的结果，结构要和前端 api/http.ts 里的 SendResult 对齐
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResponsePayload {
    status: u16,
    status_text: String,
    duration_ms: u128,
    size: usize,
    headers: Vec<(String, String)>,
    body: String,
}

#[tauri::command]
async fn send_request(payload: RequestPayload) -> Result<ResponsePayload, String> {
    let method = reqwest::Method::from_bytes(payload.method.as_bytes())
        .map_err(|_| format!("不支持的请求方法：{}", payload.method))?;

    // 60 秒超时，避免请求一直挂着让界面看起来像卡死
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| error.to_string())?;

    let mut request = client.request(method, &payload.url);

    // 只带上被勾选、且键名不为空的请求头
    for header in &payload.headers {
        if header.enabled && !header.key.trim().is_empty() {
            request = request.header(header.key.trim(), header.value.as_str());
        }
    }

    if let Some(body) = payload.body {
        if !body.is_empty() {
            request = request.body(body);
        }
    }

    let started = Instant::now();
    let response = request
        .send()
        .await
        .map_err(|error| format!("请求失败：{error}"))?;

    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_string();

    let headers: Vec<(String, String)> = response
        .headers()
        .iter()
        .map(|(key, value)| {
            (
                key.to_string(),
                String::from_utf8_lossy(value.as_bytes()).to_string(),
            )
        })
        .collect();

    // 先读成字节，再转字符串：这样二进制响应不会直接报错，只是显示成乱码
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("读取响应失败：{error}"))?;
    let size = bytes.len();

    Ok(ResponsePayload {
        status: status.as_u16(),
        status_text,
        duration_ms: started.elapsed().as_millis(),
        size,
        headers,
        body: String::from_utf8_lossy(&bytes).to_string(),
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![send_request])
        .run(tauri::generate_context!())
        .expect("apix 启动失败");
}
