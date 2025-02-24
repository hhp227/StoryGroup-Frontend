package view

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import helper.PreferenceManager
import util.InjectorUtils
import viewmodel.LoginViewModel

@Composable
fun LoginScreen() {
    val viewModel: LoginViewModel = remember { InjectorUtils.provideLoginViewModel() }

    Box(contentAlignment = Alignment.Center) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Column {
                Text(
                    text = "Welcome",
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.h4
                )
                Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.Start) {
                    Text("Email", modifier = Modifier.padding(bottom = 10.dp))
                    TextField(
                        value = viewModel.state.email,
                        onValueChange = { viewModel.state = viewModel.state.copy(email = it) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Email") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                    )
                    Text("Password", modifier = Modifier.padding(vertical = 10.dp))
                    TextField(
                        value = viewModel.state.password,
                        onValueChange = { viewModel.state = viewModel.state.copy(password = it) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Password") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                    )
                }
            }
            Button(
                onClick = viewModel::login,
                modifier = Modifier.fillMaxWidth().padding(10.dp)
            ) {
                Text("LOGIN", modifier = Modifier.padding(10.dp), fontSize = 15.sp, textAlign = TextAlign.Center)
            }
            TextButton(onClick = {

            }) {
                Text("Register")
            }
        }.also {
            viewModel.state.user?.let { user ->
                viewModel.storeUser(user)
            } ?: run {
                if (viewModel.state.error.isNotEmpty()) remember {
                    viewModel.showSnackBar()
                }
            }
        }
        if (viewModel.state.isLoading) {
            CircularProgressIndicator()
        }
        SnackbarHost(hostState = viewModel.snackbarHostState, modifier = Modifier.align(Alignment.BottomCenter))
    }
}