package view

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import helper.navigation.NavHost
import helper.navigation.Screen
import helper.navigation.composable
import helper.navigation.rememberNavController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import util.InjectorUtils
import view.ui.asyncimage.AsyncImage
import view.ui.asyncimage.loadImageBitmap
import viewmodel.MainViewModel

@Composable
fun MainScreen(coroutineScope: CoroutineScope = rememberCoroutineScope()) {
    val viewModel: MainViewModel = remember { InjectorUtils.proviceMainViewModel() }
    val navController by rememberNavController(Screen.Lounge.name)
    val currentScreen = Screen.valueOf(navController.currentBackStackScreen)
    val drawerState = DrawerState(DrawerValue.Closed) // drawerClose될때 어색해서 rememberDrawerState()는 안한다

    NavHost(
        navController = navController,
        startDestination = Screen.Lounge.name
    ) {
        composable(Screen.Lounge.name) {
            NavigationDrawer(
                drawerState = drawerState,
                currentScreen = currentScreen,
                viewModel = viewModel,
                onDrawerButtonClick = {
                    navController.navigate(it) { navController.popBackStack() }
                    coroutineScope.launch { drawerState.close() }
                }
            ) {
                LoungeScreen(
                    openDrawer = {
                        coroutineScope.launch { drawerState.open() }
                    },
                    onCreatePostButtonClick = {
                        navController.navigate(Screen.CreatePost.name)
                    }
                )
            }
        }
        composable(Screen.GroupList.name) {
            NavigationDrawer(
                drawerState = drawerState,
                currentScreen = currentScreen,
                viewModel = viewModel,
                onDrawerButtonClick = {
                    navController.navigate(it) { navController.popBackStack() }
                    coroutineScope.launch { drawerState.close() }
                }
            ) {
                GroupListScreen(
                    openDrawer = {
                        coroutineScope.launch { drawerState.open() }
                    }
                )
            }
        }
        composable(Screen.FriendList.name) {
            NavigationDrawer(
                drawerState = drawerState,
                currentScreen = currentScreen,
                viewModel = viewModel,
                onDrawerButtonClick = {
                    navController.navigate(it) { navController.popBackStack() }
                    coroutineScope.launch { drawerState.close() }
                }
            ) {
                FriendScreen(openDrawer = { coroutineScope.launch { drawerState.open() } })
            }
        }
        composable(Screen.ChatList.name) {
            NavigationDrawer(
                drawerState = drawerState,
                currentScreen = currentScreen,
                viewModel = viewModel,
                onDrawerButtonClick = {
                    navController.navigate(it) { navController.popBackStack() }
                    coroutineScope.launch { drawerState.close() }
                }
            ) {
                ChatListScreen(openDrawer = { coroutineScope.launch { drawerState.open() } })
            }
        }
        composable(Screen.Logout.name) {
            viewModel.clear()
        }
        composable(Screen.PostDetail.name) {
            PostDetailScreen()
        }
        composable(Screen.CreatePost.name) {
            CreatePostScreen(onBack = navController::navigateUp)
        }
    }.build()
    /*OurStoryAppBar(
        currentScreen = currentScreen,
        canNavigateBack = navController.previousBackStackScreen != null,
        navigateUp = navController::navigateUp
    )*/
}

@Composable
fun NavigationDrawer(
    drawerState: DrawerState,
    currentScreen: Screen,
    viewModel: MainViewModel,
    onDrawerButtonClick: (String) -> Unit,
    content: @Composable () -> Unit
) {
    ModalDrawer(
        drawerState = drawerState,
        drawerContent = {
            DrawerScreen(
                viewModel = viewModel,
                currentRoute = currentScreen,
                onDrawerButtonClick = onDrawerButtonClick
            )
        }
    ) {
        content()
    }
}

@Composable
fun OurStoryAppBar(
    currentScreen: Screen,
    canNavigateBack: Boolean,
    navigateUp: () -> Unit
) {
    TopAppBar(
        title = { Text(text = currentScreen.name) },
        navigationIcon = if (canNavigateBack) {
            {
                IconButton(onClick = navigateUp) {
                    Icon(
                        imageVector = Icons.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            }
        } else null
    )
}
