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
    let web_mode = args.iter().any(|a| a == "--web");
    let port: u16 = args.iter()
        .position(|a| a == "--port")
        .and_then(|i| args.get(i + 1))
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    if web_mode {
        let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
        rt.block_on(web_server::run_web_server(port));
    } else {
        run_terminal().expect("terminal error");
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
