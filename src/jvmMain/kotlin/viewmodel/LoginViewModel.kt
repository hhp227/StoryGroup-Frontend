package viewmodel

import androidx.compose.material.SnackbarHostState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import data.UserRepository
import helper.PreferenceManager
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import model.Resource
import model.User
import java.util.regex.Pattern
import kotlin.Boolean
import kotlin.String

class LoginViewModel internal constructor(
    private val repository: UserRepository,
    private val preferenceManager: PreferenceManager
): ViewModel() {
    var state by mutableStateOf(State())

    var snackbarHostState by mutableStateOf(SnackbarHostState())

    private fun isEmailValid(email: String): Boolean {
        return if (!email.contains('@')) {
            Pattern.matches("^(.+)@(.+)\$", email)
        } else {
            email.isNotEmpty()
        }
    }

    private fun isPasswordValid(password: String): Boolean {
        return password.length > 5
    }

    fun storeUser(user: User) {
        viewModelScope.launch {
            preferenceManager.storeUser(user)
        }
    }

    fun login() {
        if (isEmailValid(state.email) && isPasswordValid(state.password)) {
            repository.login(state.email, state.password)
                .onEach { result ->
                    when (result) {
                        is Resource.Success -> {
                            state = state.copy(
                                isLoading = false,
                                user = result.data
                            )
                        }
                        is Resource.Error -> {
                            state = state.copy(
                                isLoading = false,
                                error = result.message ?: "An unexpected error occured"
                            )
                        }
                        is Resource.Loading -> {
                            state = state.copy(
                                isLoading = true,
                                error = ""
                            )
                        }
                    }
                }.launchIn(viewModelScope)
        } else {
            println("email 또는 password가 잘못되었습니다.")
        }
    }

    fun showSnackBar() {
        viewModelScope.launch {
            snackbarHostState.showSnackbar(state.error)
        }
    }

    data class State(
        val email: String = "",
        val password: String = "",
        val isLoading: Boolean = false,
        val user: User? = null,
        val error: String = ""
    )
}