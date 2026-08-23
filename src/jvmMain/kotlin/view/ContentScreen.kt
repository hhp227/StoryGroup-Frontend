package view

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import util.InjectorUtils
import viewmodel.ContentViewModel

@Composable
fun ContentScreen() {
    val contentViewModel: ContentViewModel = remember { InjectorUtils.provideContentViewModel() }

    if (contentViewModel.user != null) {
        MainScreen()
    } else {
        LoginScreen()
    }
}