mod map;
mod item;
mod skill;
mod event;
mod monster;
mod player;
mod game;
mod game_snapshot;
mod input;
mod ui;
mod web_backend;
mod web_server;

use std::io;
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

    // Find a free port (8080-8090) or use the --port argument
    let port = match fixed_port {
        Some(p) => p,
        None => match find_free_port(8080, 8090) {
            Some(p) => p,
            None => {
                fatal_error(
                    "ポート 8080〜8090 が全て使用中です。\n\
                     他のアプリを閉じてから再度実行してください。\n\n\
                     Port 8080-8090 are all in use.\n\
                     Close other applications and try again."
                );
                return;
            }
        },
    };

    // Default: web mode — start server then open browser
    let rt = tokio::runtime::Runtime::new().unwrap_or_else(|e| {
        fatal_error(&format!("Failed to start async runtime: {e}"));
        std::process::exit(1);
    });
    rt.block_on(async move {
        let url  = format!("http://localhost:{port}");
        let url2 = url.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(800)).await;
            open_browser(&url2);
        });
        web_server::run_web_server(port).await;
    });
}

/// Try ports from `start` to `end` and return the first free one.
fn find_free_port(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        if std::net::TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Some(port);
        }
    }
    None
}

/// Print an error and wait for Enter so the console window stays visible.
fn fatal_error(msg: &str) {
    eprintln!("\n[ERROR]\n{msg}\n");
    eprintln!("Press Enter to close...");
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
