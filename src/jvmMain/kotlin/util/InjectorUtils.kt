package util

import api.AuthService
import data.UserRepository
import helper.PreferenceManager
import viewmodel.ContentViewModel
import viewmodel.LoginViewModel
import viewmodel.MainViewModel
import viewmodel.RegisterViewModel

object InjectorUtils {
    private val preferenceManager = PreferenceManager.getInstance()

    private fun getUserRepository(): UserRepository {
        return UserRepository.getInstance(AuthService.create())
    }

    private fun getPreferenceManager() = preferenceManager

    fun provideLoginViewModel(): LoginViewModel {
        return LoginViewModel(getUserRepository(), getPreferenceManager())
    }

    fun provideRegisterViewModel(): RegisterViewModel {
        return RegisterViewModel(getUserRepository(), getPreferenceManager())
    }

    fun provideContentViewModel(): ContentViewModel {
        return ContentViewModel(getPreferenceManager())
    }

    fun proviceMainViewModel(): MainViewModel {
        return MainViewModel(getPreferenceManager())
    }
}