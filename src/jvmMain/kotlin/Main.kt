// Copyright 2000-2021 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license that can be found in the LICENSE file.
import androidx.compose.desktop.ui.tooling.preview.Preview
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import view.ContentScreen

@Composable
@Preview
fun App() {
    MaterialTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colors.background
        ) {
            ContentScreen()
        }
    }
}

fun main() {
    application {
        Window(title = "OurStory", onCloseRequest = ::exitApplication) {
            App()
        }
    }
}

/*fun main() {
    application {
        val state = remember { mutableStateOf(false) }

        LaunchedEffect(null) {
            delay(1000)
            state.value = !state.value
        }
        if (state.value) {
            Window(title = "OurStory", onCloseRequest = ::exitApplication) {
                App()
            }
        } else {
            Window(
                onCloseRequest = ::exitApplication,
                title = "Image Viewer",
                state = WindowState(
                    position = WindowPosition.Aligned(Alignment.Center),
                    size = getPreferredWindowSize(800, 300)
                ),
                undecorated = true,
            ) {
                MaterialTheme {
                    Box(Modifier.fillMaxSize().background(DarkGray)) {
                        Text(
                            // TODO implement common resources
                            "Image Viewer",
                            Modifier.align(Alignment.Center),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 100.sp
                        )
                    }
                }
            }
        }
    }
}

fun getPreferredWindowSize(desiredWidth: Int, desiredHeight: Int): DpSize {
    val screenSize: Dimension = Toolkit.getDefaultToolkit().screenSize
    val preferredWidth: Int = (screenSize.width * 0.8f).toInt()
    val preferredHeight: Int = (screenSize.height * 0.8f).toInt()
    val width: Int = if (desiredWidth < preferredWidth) desiredWidth else preferredWidth
    val height: Int = if (desiredHeight < preferredHeight) desiredHeight else preferredHeight
    return DpSize(width.dp, height.dp)
}*/