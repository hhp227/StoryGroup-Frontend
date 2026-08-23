package view

import androidx.compose.foundation.layout.Column
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.*

@Composable
fun PostDetailScreen() {
    var text by remember { mutableStateOf("Hello, CreatePostScreen!") }

    Column {
        Button(onClick = {
            text = "Hello, OurStory!"
        }) {
            Text(text)
        }
    }
}