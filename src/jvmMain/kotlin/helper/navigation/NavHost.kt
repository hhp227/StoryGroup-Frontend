package helper.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

class NavHost(
    val navController: NavController,
    startDestination: String,
    modifier: Modifier = Modifier,
    val contents: @Composable NavigationGraphBuilder.() -> Unit
) {
    @Composable
    fun build() {
        NavigationGraphBuilder().renderContents()
    }

    inner class NavigationGraphBuilder(
        val navController: NavController = this@NavHost.navController
    ) {
        @Composable
        fun renderContents() {
            this@NavHost.contents(this)
        }
    }
}

@Composable
fun NavHost.NavigationGraphBuilder.composable(
    route: String,
    content: @Composable () -> Unit
) {
    if (navController.currentBackStackScreen == route) {
        content()
    }
}