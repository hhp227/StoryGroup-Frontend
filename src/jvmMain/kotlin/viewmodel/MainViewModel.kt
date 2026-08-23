package viewmodel

import helper.PreferenceManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainViewModel(private val preferenceManager: PreferenceManager) : ViewModel() {
    val userFlow get() = preferenceManager.userFlow

    fun clear() {
        viewModelScope.launch {
            delay(100)
            preferenceManager.storeUser(null)
        }
    }
}