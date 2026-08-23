package viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import helper.PreferenceManager
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import model.User

class ContentViewModel(preferenceManager: PreferenceManager) : ViewModel() {
    var user by mutableStateOf<User?>(null)

    init {
        preferenceManager.userFlow
            .onEach { user = it }
            .catch {
                println("Error: $it")
                emit(null)
            }
            .launchIn(viewModelScope)
    }
}