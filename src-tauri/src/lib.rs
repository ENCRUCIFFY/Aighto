use std::env;
use std::sync::Mutex;
use tauri::Manager;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

const DISCORD_APP_ID: &str = "1539742627367489628";

pub struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
}

impl Default for DiscordState {
    fn default() -> Self {
        Self {
            client: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn set_discord_music_presence(
    state: tauri::State<'_, DiscordState>,
    title: String,
    artist: String,
    station: Option<String>,
    start_timestamp: Option<i64>,
) -> Result<(), String> {
    let mut lock = state.client.lock().map_err(|e| e.to_string())?;

    // Attempt connection if not connected yet
    if lock.is_none() {
        if let Ok(mut client) = DiscordIpcClient::new(DISCORD_APP_ID) {
            if client.connect().is_ok() {
                *lock = Some(client);
            }
        }
    }

    if let Some(client) = lock.as_mut() {
        let details_text = format!("Listening to {}", title);
        let state_text = if let Some(ref st) = station {
            format!("{} • by {}", st, artist)
        } else {
            format!("by {}", artist)
        };

        let mut act = activity::Activity::new()
            .details(&details_text)
            .state(&state_text)
            .assets(
                activity::Assets::new()
                    .large_image("https://wszyjsirtuwoxfqsrbiq.supabase.co/storage/v1/object/public/app-updates/aighto_logo.png")
                    .large_text("Aighto Desktop"),
            );

        if let Some(ts) = start_timestamp {
            act = act.timestamps(activity::Timestamps::new().start(ts));
        }

        if client.set_activity(act).is_err() {
            // If connection was lost, reset client so next invocation reconnects
            *lock = None;
        }
    }
    Ok(())
}

#[tauri::command]
fn clear_discord_music_presence(state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut lock = state.client.lock().map_err(|e| e.to_string())?;
    if let Some(client) = lock.as_mut() {
        let _ = client.clear_activity();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Inject low-overhead Chromium/WebView2 performance flags:
    // Strips background telemetry, unused media routers, and network bloat while enabling GPU zero-copy acceleration.
    if env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_err() {
        env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-background-networking \
             --disable-background-timer-throttling \
             --disable-backgrounding-occluded-windows \
             --disable-breakpad \
             --disable-component-update \
             --disable-domain-reliability \
             --disable-sync \
             --disable-features=MediaRouter,Translate,CalculateNativeWinOcclusion \
             --enable-features=ParallelDownloading \
             --renderer-process-limit=4 \
             --enable-gpu-rasterization \
             --enable-zero-copy",
        );
    }

    tauri::Builder::default()
        .manage(DiscordState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus existing window when launched again
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            set_discord_music_presence,
            clear_discord_music_presence,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Force dynamic taskbar and top window ribbon icon to the new 3D ribbon logo
            if let Some(window) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon() {
                    let _ = window.set_icon(icon.clone());
                }
            }

            // On Windows, notify Windows Explorer shell that file associations and app shortcut icons changed
            // so cached icons on the Desktop, Taskbar, and Start Menu immediately refresh to the new logo upon update.
            #[cfg(target_os = "windows")]
            {
                unsafe {
                    #[link(name = "shell32")]
                    extern "system" {
                        fn SHChangeNotify(
                            w_event_id: i32,
                            u_flags: u32,
                            dw_item1: *const std::ffi::c_void,
                            dw_item2: *const std::ffi::c_void,
                        );
                    }
                    const SHCNE_ASSOCCHANGED: i32 = 0x08000000;
                    const SHCNF_IDLIST: u32 = 0x0000;
                    SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, std::ptr::null(), std::ptr::null());
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
