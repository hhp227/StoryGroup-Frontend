package helper.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable

class NavController(
    private val startDestination: String,
    var backStackScreens: MutableList<String> = mutableListOf(startDestination)
) {
    private var currentScreen: MutableState<String> = mutableStateOf(startDestination)

    val currentBackStackScreen: String
        get() = currentScreen.value

    val previousBackStackScreen: String?
        get() {
            val iterator = backStackScreens.reversed().iterator()

            if (iterator.hasNext()) {
                iterator.next()
            }
            return iterator.asSequence().firstOrNull()
        }

    fun popBackStack(): Boolean {
        return if (backStackScreens.isEmpty()) {
            // Nothing to pop if the back stack is empty
            false
        } else {
            popBackStack(currentBackStackScreen, true)
        }
    }

    fun popBackStack(currentBackStackScreen: String, inclusive: Boolean): Boolean {
        return backStackScreens.remove(currentBackStackScreen)
    }

    fun navigate(route: String) {
        if (route != currentScreen.value) {
            currentScreen.value = route

            backStackScreens.add(currentScreen.value)
        }
    }

    fun navigate(route: String, builder: Unit.() -> Unit) {
        navigate(route).apply(builder)
    }

    fun navigateUp() {
        if (backStackScreens.isNotEmpty()) {
            backStackScreens.remove(currentScreen.value)
            backStackScreens.lastOrNull()?.also { currentScreen.value = it }
        }
    }
}

@Composable
fun rememberNavController(
    startDestination: String,
    backStackScreens: MutableList<String> = mutableListOf(startDestination)
): MutableState<NavController> = rememberSaveable {
    mutableStateOf(NavController(startDestination, backStackScreens))
}