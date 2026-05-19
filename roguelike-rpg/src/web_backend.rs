use std::io::{self, Write};
use ratatui::{
    backend::Backend,
    buffer::Cell,
    layout::{Position, Rect, Size},
    backend::WindowSize,
    style::{Color, Modifier},
};

// ── Channel writer ────────────────────────────────────────────────────────────

pub struct ChannelWriter {
    tx:  tokio::sync::mpsc::Sender<Vec<u8>>,
    buf: Vec<u8>,
}

impl ChannelWriter {
    pub fn new(tx: tokio::sync::mpsc::Sender<Vec<u8>>) -> Self {
        Self { tx, buf: Vec::with_capacity(8192) }
    }
}

impl Write for ChannelWriter {
    fn write(&mut self, data: &[u8]) -> io::Result<usize> {
        self.buf.extend_from_slice(data);
        Ok(data.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        if !self.buf.is_empty() {
            let data = std::mem::take(&mut self.buf);
            self.tx.blocking_send(data)
                .map_err(|_| io::Error::new(io::ErrorKind::BrokenPipe, "ws closed"))?;
        }
        Ok(())
    }
}

// ── ANSI backend ──────────────────────────────────────────────────────────────

pub struct AnsiBackend<W: Write> {
    writer: W,
    width:  u16,
    height: u16,
}

impl<W: Write> AnsiBackend<W> {
    pub fn new(writer: W, width: u16, height: u16) -> Self {
        Self { writer, width, height }
    }

    pub fn resize(&mut self, width: u16, height: u16) {
        self.width  = width;
        self.height = height;
    }
}

// ── Color / style helpers ─────────────────────────────────────────────────────

fn fg_ansi(color: Color) -> String {
    match color {
        Color::Reset        => "\x1b[39m".into(),
        Color::Black        => "\x1b[30m".into(),
        Color::Red          => "\x1b[31m".into(),
        Color::Green        => "\x1b[32m".into(),
        Color::Yellow       => "\x1b[33m".into(),
        Color::Blue         => "\x1b[34m".into(),
        Color::Magenta      => "\x1b[35m".into(),
        Color::Cyan         => "\x1b[36m".into(),
        Color::Gray         => "\x1b[37m".into(),
        Color::DarkGray     => "\x1b[90m".into(),
        Color::LightRed     => "\x1b[91m".into(),
        Color::LightGreen   => "\x1b[92m".into(),
        Color::LightYellow  => "\x1b[93m".into(),
        Color::LightBlue    => "\x1b[94m".into(),
        Color::LightMagenta => "\x1b[95m".into(),
        Color::LightCyan    => "\x1b[96m".into(),
        Color::White        => "\x1b[97m".into(),
        Color::Rgb(r, g, b) => format!("\x1b[38;2;{r};{g};{b}m"),
        Color::Indexed(i)   => format!("\x1b[38;5;{i}m"),
    }
}

fn bg_ansi(color: Color) -> String {
    match color {
        Color::Reset        => "\x1b[49m".into(),
        Color::Black        => "\x1b[40m".into(),
        Color::Red          => "\x1b[41m".into(),
        Color::Green        => "\x1b[42m".into(),
        Color::Yellow       => "\x1b[43m".into(),
        Color::Blue         => "\x1b[44m".into(),
        Color::Magenta      => "\x1b[45m".into(),
        Color::Cyan         => "\x1b[46m".into(),
        Color::Gray         => "\x1b[47m".into(),
        Color::DarkGray     => "\x1b[100m".into(),
        Color::LightRed     => "\x1b[101m".into(),
        Color::LightGreen   => "\x1b[102m".into(),
        Color::LightYellow  => "\x1b[103m".into(),
        Color::LightBlue    => "\x1b[104m".into(),
        Color::LightMagenta => "\x1b[105m".into(),
        Color::LightCyan    => "\x1b[106m".into(),
        Color::White        => "\x1b[107m".into(),
        Color::Rgb(r, g, b) => format!("\x1b[48;2;{r};{g};{b}m"),
        Color::Indexed(i)   => format!("\x1b[48;5;{i}m"),
    }
}

// ── Backend impl ──────────────────────────────────────────────────────────────

impl<W: Write> Backend for AnsiBackend<W> {
    fn draw<'a, I>(&mut self, content: I) -> io::Result<()>
    where
        I: Iterator<Item = (u16, u16, &'a Cell)>,
    {
        let mut buf = String::with_capacity(8192);
        for (x, y, cell) in content {
            // Cursor position (ANSI is 1-based)
            buf.push_str(&format!("\x1b[{};{}H", y + 1, x + 1));
            // Reset + apply style
            let style = cell.style();
            buf.push_str("\x1b[0m");
            buf.push_str(&fg_ansi(style.fg.unwrap_or(Color::Reset)));
            buf.push_str(&bg_ansi(style.bg.unwrap_or(Color::Reset)));
            let m = style.add_modifier;
            if m.contains(Modifier::BOLD)       { buf.push_str("\x1b[1m"); }
            if m.contains(Modifier::DIM)        { buf.push_str("\x1b[2m"); }
            if m.contains(Modifier::ITALIC)     { buf.push_str("\x1b[3m"); }
            if m.contains(Modifier::UNDERLINED) { buf.push_str("\x1b[4m"); }
            if m.contains(Modifier::REVERSED)   { buf.push_str("\x1b[7m"); }
            buf.push_str(cell.symbol());
        }
        buf.push_str("\x1b[0m");
        self.writer.write_all(buf.as_bytes())
    }

    fn hide_cursor(&mut self) -> io::Result<()> { self.writer.write_all(b"\x1b[?25l") }
    fn show_cursor(&mut self) -> io::Result<()> { self.writer.write_all(b"\x1b[?25h") }

    fn get_cursor_position(&mut self) -> io::Result<Position> {
        Ok(Position::new(0, 0))
    }
    fn set_cursor_position<P: Into<Position>>(&mut self, pos: P) -> io::Result<()> {
        let p = pos.into();
        write!(self.writer, "\x1b[{};{}H", p.y + 1, p.x + 1)
    }

    fn clear(&mut self) -> io::Result<()> {
        self.writer.write_all(b"\x1b[2J\x1b[H")
    }

    fn size(&self) -> io::Result<Size> {
        Ok(Size::new(self.width, self.height))
    }

    fn window_size(&mut self) -> io::Result<WindowSize> {
        Ok(WindowSize {
            columns_rows: Size::new(self.width, self.height),
            pixels: Size::new(0, 0),
        })
    }

    fn flush(&mut self) -> io::Result<()> { self.writer.flush() }
}
