package view

import androidx.compose.foundation.layout.Column
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.*
import util.InjectorUtils
import viewmodel.RegisterViewModel

@Composable
fun RegisterScreen() {
    val viewModel: RegisterViewModel = remember { InjectorUtils.provideRegisterViewModel() }

    Column {
        Button(onClick = {}) {
            Text("Hello RegisterScreen")
        }
    }
}