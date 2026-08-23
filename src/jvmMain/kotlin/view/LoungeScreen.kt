package view

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Menu
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier

@Composable
fun LoungeScreen(
    openDrawer: () -> Unit,
    onCreatePostButtonClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = { Text(text = "LoungeScreen") },
                navigationIcon = {
                    IconButton(onClick = openDrawer) {
                        Icon(Icons.Filled.Menu, "OpenDrawer")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreatePostButtonClick) {
                Icon(Icons.Filled.Add, "Add")
            }
        }
    ) {
        Column {
            Button(onClick = openDrawer) {
                Text("Hello, LoungeScreen!")
            }
        }
    }
}