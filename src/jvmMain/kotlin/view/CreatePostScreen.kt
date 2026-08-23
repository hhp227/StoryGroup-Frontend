package view

import androidx.compose.foundation.layout.Column
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.runtime.*

@Composable
fun CreatePostScreen(onBack: () -> Unit) {
    var text by remember { mutableStateOf("Hello, CreatePostScreen!") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = text) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "OpenDrawer")
                    }
                }
            )
        }
    ) {
        Column {
            Button(onClick = {
                text = "Hello, OurStory!"
            }) {
                Text(text)
            }
        }
    }
}