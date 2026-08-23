package view

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import helper.navigation.Screen
import util.URLs.BASE_URL
import view.ui.asyncimage.AsyncImage
import view.ui.asyncimage.loadImageBitmap
import viewmodel.MainViewModel

@Composable
fun DrawerScreen(viewModel: MainViewModel, currentRoute: Screen, onDrawerButtonClick: (String) -> Unit) {
    val user by viewModel.userFlow.collectAsState(null)

    Column(
        Modifier.fillMaxWidth().wrapContentHeight().background(MaterialTheme.colors.primary).padding(16.dp),
        Arrangement.Bottom
    ) {
        AsyncImage(
            load = { loadImageBitmap("$BASE_URL/php/ProfileImages/${user?.profileImage}") },
            painterFor = { remember { BitmapPainter(it) } },
            contentDescription = "Sample",
            modifier = Modifier.size(100.dp)
        )
        Text(
            text = user?.name ?: "name",
            modifier = Modifier.padding(top = 8.dp),
            color = Color.White,
            style = MaterialTheme.typography.body1
        )
        Text(text = user?.email ?: "email", color = Color.White)
    }
    Divider(color = MaterialTheme.colors.onSurface.copy(alpha = .2f))
    DrawerButton(Icons.Filled.ChatBubble, Screen.Lounge.name, currentRoute.name == Screen.Lounge.name) {
        onDrawerButtonClick(Screen.Lounge.name)
    }
    DrawerButton(Icons.Filled.Group, Screen.GroupList.name, currentRoute.name == Screen.GroupList.name) {
        onDrawerButtonClick(Screen.GroupList.name)
    }
    DrawerButton(Icons.Filled.Person, Screen.FriendList.name, currentRoute.name == Screen.FriendList.name) {
        onDrawerButtonClick(Screen.FriendList.name)
    }
    DrawerButton(Icons.Filled.Message, Screen.ChatList.name, currentRoute.name == Screen.ChatList.name) {
        onDrawerButtonClick(Screen.ChatList.name)
    }
    DrawerButton(Icons.Filled.ExitToApp, Screen.Logout.name, currentRoute.name == Screen.Logout.name) {
        onDrawerButtonClick(Screen.Logout.name)
    }
}


@Composable
private fun DrawerButton(icon: ImageVector, label: String, isSelected: Boolean, modifier: Modifier = Modifier, action: () -> Unit) {
    val colors = MaterialTheme.colors
    val textIconColor = if (isSelected) colors.primary else colors.onSurface.copy(alpha = 0.6f)

    Surface(
        modifier = modifier.padding(start = 8.dp, top = 8.dp, end = 8.dp).fillMaxWidth(),
        color = if (isSelected) colors.primary.copy(alpha = 0.12f) else Color.Transparent,
        shape = MaterialTheme.shapes.small
    ) {
        TextButton(
            onClick = action,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Image(
                    imageVector = icon,
                    contentDescription = null,
                    colorFilter = ColorFilter.tint(textIconColor),
                    alpha = if (isSelected) 1f else 0.6f
                )
                Spacer(Modifier.width(16.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.body2,
                    color = textIconColor
                )
            }
        }
    }
}
