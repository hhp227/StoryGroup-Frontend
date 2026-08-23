package view

import androidx.compose.foundation.layout.Column
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.runtime.*

@Composable
fun ChatListScreen(openDrawer: () -> Unit) {
    var text by remember { mutableStateOf("Hello, ChatListScreen!") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = text) },
                navigationIcon = {
                    IconButton(onClick = openDrawer) {
                        Icon(Icons.Filled.Menu, "OpenDrawer")
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