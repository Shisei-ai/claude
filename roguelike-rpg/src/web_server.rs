use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Duration;

use axum::{
    Router,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use crossterm::event::{KeyCode, KeyModifiers};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc as async_mpsc;

use crate::game::Game;
use crate::game_snapshot::GameSnapshot;
use crate::input::handle_input;

static HTML: &str = include_str!("../static/index.html");

enum WebInput {
    Key(KeyCode),
    Resize(u16, u16),
}

pub async fn run_web_server(port: u16) {
    let addr = format!("0.0.0.0:{port}");
    let app = Router::new()
        .route("/",   get(serve_html))
        .route("/ws", get(ws_handler));

    println!("\n  ✦  Open your browser: http://localhost:{port}");
    println!("  ✦  Press Ctrl+C to stop the server\n");

    let listener = tokio::net::TcpListener::bind(&addr).await
        .unwrap_or_else(|e| panic!("Failed to bind {addr}: {e}"));
    axum::serve(listener, app).await.expect("server error");
}

async fn serve_html() -> impl IntoResponse {
    Html(HTML)
}

async fn ws_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(socket: WebSocket) {
    let (mut ws_tx, mut ws_rx) = socket.split();
    let (output_tx, mut output_rx) = async_mpsc::channel::<Vec<u8>>(64);
    let (input_tx,  input_rx)      = mpsc::sync_channel::<WebInput>(64);

    let game_thread = std::thread::spawn(move || {
        run_game_thread(input_rx, output_tx);
    });

    let pump = tokio::spawn(async move {
        while let Some(data) = output_rx.recv().await {
            if let Ok(s) = String::from_utf8(data) {
                if ws_tx.send(Message::Text(s.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    while let Some(Ok(msg)) = ws_rx.next().await {
        match msg {
            Message::Text(text) => {
                if let Some(input) = parse_ws_message(&text) {
                    if input_tx.send(input).is_err() { break; }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    drop(input_tx);
    pump.abort();
    game_thread.join().ok();
}

fn run_game_thread(
    input_rx:  mpsc::Receiver<WebInput>,
    output_tx: async_mpsc::Sender<Vec<u8>>,
) {
    let mut game = Game::new();

    // Consume initial resize (optional)
    let _ = input_rx.recv_timeout(Duration::from_secs(5));

    send_snapshot(&game, &output_tx);

    loop {
        match input_rx.recv_timeout(Duration::from_millis(100)) {
            Ok(WebInput::Key(key)) => {
                let quit = handle_input(&mut game, key, KeyModifiers::empty());
                send_snapshot(&game, &output_tx);
                if quit { break; }
            }
            Ok(WebInput::Resize(_, _)) => {
                send_snapshot(&game, &output_tx);
            }
            Err(RecvTimeoutError::Timeout)      => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }
}

fn send_snapshot(game: &Game, tx: &async_mpsc::Sender<Vec<u8>>) {
    if let Ok(json) = serde_json::to_vec(&GameSnapshot::from_game(game)) {
        tx.blocking_send(json).ok();
    }
}

fn parse_ws_message(text: &str) -> Option<WebInput> {
    let v: serde_json::Value = serde_json::from_str(text).ok()?;
    match v["type"].as_str()? {
        "resize" => {
            let cols = v["cols"].as_u64()? as u16;
            let rows = v["rows"].as_u64()? as u16;
            Some(WebInput::Resize(cols, rows))
        }
        "key" => {
            let code  = v["code"].as_str().unwrap_or("");
            let key   = v["key"].as_str().unwrap_or("");
            let shift = v["shiftKey"].as_bool().unwrap_or(false);

            let keycode = match code {
                "ArrowLeft"  => KeyCode::Left,
                "ArrowRight" => KeyCode::Right,
                "ArrowUp"    => KeyCode::Up,
                "ArrowDown"  => KeyCode::Down,
                "Enter"      => KeyCode::Enter,
                "Escape"     => KeyCode::Esc,
                "F1" => KeyCode::F(1), "F2" => KeyCode::F(2),
                "F3" => KeyCode::F(3), "F4" => KeyCode::F(4),
                _ => {
                    let ch = if key.len() == 1 {
                        key.chars().next()?
                    } else if key == ">" { '>'
                    } else if key == "<" { '<'
                    } else { return None; };
                    let ch = if shift && ch.is_alphabetic() {
                        ch.to_uppercase().next().unwrap_or(ch)
                    } else { ch };
                    KeyCode::Char(ch)
                }
            };
            Some(WebInput::Key(keycode))
        }
        _ => None,
    }
}
