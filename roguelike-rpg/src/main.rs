mod map;
mod item;
mod skill;
mod relic;
mod event;
mod monster;
mod player;
mod game;
mod game_snapshot;
mod input;
mod ui;
mod web_backend;
mod web_server;

use std::io::{self, Write};
use std::time::Duration;

use crossterm::{
    event::{self as ctevent, DisableMouseCapture, EnableMouseCapture, Event, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};

use crate::game::Game;
use crate::input::handle_input;

fn main() {
    // Catch panics on the main thread only (e.g. startup failures).
    // Spawned game-session threads must NOT block on stdin — they just log.
    let is_main_thread = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true));
    let is_main_clone = is_main_thread.clone();
    std::panic::set_hook(Box::new(move |info| {
        let _ = writeln!(io::stderr(), "\n==============================");
        let _ = writeln!(io::stderr(), "  ERROR / エラーが発生しました");
        let _ = writeln!(io::stderr(), "==============================");
        let _ = writeln!(io::stderr(), "{info}");
        if is_main_clone.load(std::sync::atomic::Ordering::Relaxed) {
            let _ = writeln!(io::stderr(), "\nPress Enter to close... / Enter キーで閉じる");
            let mut buf = String::new();
            let _ = io::stdin().read_line(&mut buf);
        }
    }));
    // After this point, spawned threads will not block stdin on panic.
    is_main_thread.store(false, std::sync::atomic::Ordering::Relaxed);

    let args: Vec<String> = std::env::args().collect();

    let terminal_mode = args.iter().any(|a| a == "--terminal");
    let fixed_port: Option<u16> = args.iter()
        .position(|a| a == "--port")
        .and_then(|i| args.get(i + 1))
        .and_then(|p| p.parse().ok());

    if terminal_mode {
        if let Err(e) = run_terminal() {
            fatal_error(&format!("Terminal error: {e}"));
        }
        return;
    }

    // Bind the listener here so we hold the port until the server starts.
    // This also avoids the "port free → port grabbed by someone else" race.
    let listener = match fixed_port {
        Some(p) => bind_port(p),
        None    => try_ports(8080, 8090),
    };

    let port = listener.local_addr()
        .expect("listener has no local address")
        .port();

    println!("\n  ✦  ゲームを起動中... / Starting game...");
    println!("  ✦  ブラウザで開く / Open in browser: http://localhost:{port}");
    println!("  ✦  このウィンドウは閉じないでください / Keep this window open");
    println!("  ✦  Ctrl+C で終了 / Ctrl+C to quit\n");

    let rt = tokio::runtime::Runtime::new()
        .expect("Failed to start tokio runtime");

    rt.block_on(async move {
        let url = format!("http://localhost:{port}");
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(800)).await;
            open_browser(&url);
        });
        web_server::run_web_server_with_listener(listener).await;
    });
}

fn bind_port(port: u16) -> std::net::TcpListener {
    match std::net::TcpListener::bind(("0.0.0.0", port)) {
        Ok(l) => l,
        Err(e) => {
            fatal_error(&format!(
                "ポート {port} を使用できません: {e}\n\
                 Port {port} is not available: {e}"
            ));
            std::process::exit(1);
        }
    }
}

fn try_ports(start: u16, end: u16) -> std::net::TcpListener {
    for port in start..=end {
        if let Ok(l) = std::net::TcpListener::bind(("0.0.0.0", port)) {
            return l;
        }
    }
    fatal_error(&format!(
        "ポート {start}〜{end} が全て使用中です。\n\
         他のアプリを閉じてから再度実行してください。\n\n\
         Port {start}-{end} are all in use.\n\
         Close other applications and try again."
    ));
    std::process::exit(1);
}

fn fatal_error(msg: &str) {
    let _ = writeln!(io::stderr(), "\n[ERROR]\n{msg}\n");
    let _ = writeln!(io::stderr(), "Press Enter to close... / Enter キーで閉じる");
    let mut buf = String::new();
    let _ = io::stdin().read_line(&mut buf);
}

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", url])
            .spawn().ok();
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn().ok();
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn().ok();
    }
}

fn run_terminal() -> io::Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend  = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let result = run_game_loop(&mut terminal);

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture)?;
    terminal.show_cursor()?;

    if let Err(e) = result {
        eprintln!("Error: {e}");
    }
    Ok(())
}

fn run_game_loop(terminal: &mut Terminal<CrosstermBackend<io::Stdout>>) -> io::Result<()> {
    let mut game = Game::new();

    loop {
        terminal.draw(|f| ui::render(f, &game))?;

        if ctevent::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = ctevent::read()? {
                let quit = handle_input(&mut game, key.code, key.modifiers);
                if quit { break; }
            }
        }
    }
    Ok(())
}
